import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError, Modules } from '@medusajs/framework/utils';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';

import { importProductsWithCategoriesWorkflow } from '../../../../workflows/import-products/import-products-with-categories-workflow';
import { addFileToCache, addCategoryMappingToCache } from './file-cache';

// Tipos base
type FileInfo = {
  url?: string;
  name?: string;
  key?: string;
  [key: string]: unknown;
};

type FileProvider = {
  getUploadFilePath?: (key: string) => Promise<string>;
  getUploadFileUrl?: (key: string) => Promise<string>;
  uploadDir_?: string;
  privateUploadDir_?: string;
};

type WorkflowStats = {
  created?: number;
  updated?: number;
  errors?: unknown[];
  [key: string]: unknown;
};

type WorkflowResponse = {
  id?: string;
  job_id?: string;
  transaction_id?: string;
  status?: string;
  result?: {
    stats?: WorkflowStats;
  };
  categories_processed?: boolean;
  toCreate?: number;
  toUpdate?: number;
};

// Tipos para request body
type ImportRequestBody = {
  file_key?: string;
  file_id?: string;
  originalname?: string;
  file_url?: string;
  fileContent?: string;
  filename?: string;
  file?: {
    url?: string;
    id?: string;
    name?: string;
  };
  [key: string]: unknown;
};

// Tipo para File Module Service (compatível com IFileModuleService do MedusaJS)
type FileModuleService = {
  retrieve?: (id: string) => Promise<FileInfo | null>;
  getFile?: (id: string) => Promise<FileInfo | null>;
  fileProviderService_?: {
    fileProvider_?: FileProvider;
  };
} & Record<string, unknown>; // Permitir outras propriedades do IFileModuleService

async function downloadFileFromUrl(
  url: string,
  logger?: { info?: (msg: string) => void; error?: (msg: string) => void; warn?: (msg: string) => void },
  authToken?: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Se for URL local (file://), ler do sistema de arquivos
    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '');
      logger?.info(`[downloadFileFromUrl] Lendo arquivo local: ${filePath}`);
      try {
        const buffer = fs.readFileSync(filePath);
        resolve(buffer);
      } catch (error) {
        logger?.error(`[downloadFileFromUrl] Erro ao ler arquivo local: ${error}`);
        reject(error);
      }
      return;
    }

    // Se for caminho absoluto local (sem protocolo), tentar ler diretamente
    if (path.isAbsolute(url) && !url.startsWith('http')) {
      logger?.info(`[downloadFileFromUrl] Tentando ler caminho absoluto: ${url}`);
      try {
        const buffer = fs.readFileSync(url);
        resolve(buffer);
      } catch (error) {
        logger?.warn(`[downloadFileFromUrl] Não conseguiu ler como arquivo local, tentando HTTP: ${error}`);
        // Continuar para tentar HTTP
      }
    }

    // Se for URL HTTP/HTTPS, baixar
    logger?.info(`[downloadFileFromUrl] Baixando de URL HTTP/HTTPS: ${url}`);
    const client = url.startsWith('https') ? https : http;

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {} as Record<string, string>,
    };

    // Adicionar token de autenticação se fornecido
    if (authToken) {
      options.headers['x-medusa-access-token'] = authToken;
      logger?.info(`[downloadFileFromUrl] Adicionando token de autenticação`);
    }

    const request = client.request(options, (response) => {
      if (response.statusCode !== 200) {
        logger?.error(`[downloadFileFromUrl] Status code: ${response.statusCode}`);
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        logger?.info(`[downloadFileFromUrl] Arquivo baixado com sucesso (${chunks.length} chunks)`);
        resolve(Buffer.concat(chunks));
      });
      response.on('error', (error) => {
        logger?.error(`[downloadFileFromUrl] Erro durante download: ${error}`);
        reject(error);
      });
    });

    request.on('error', (error) => {
      logger?.error(`[downloadFileFromUrl] Erro na requisição: ${error}`);
      reject(error);
    });

    request.end();
  });
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger');

  // Verificar se File Module está registrado no container usando Modules.FILE conforme documentação
  let fileModuleService: FileModuleService | null = null;
  let fileModuleAvailable = false;
  try {
    const resolvedFileModule = req.scope.resolve(Modules.FILE);
    fileModuleService = resolvedFileModule as unknown as FileModuleService;
    fileModuleAvailable = !!fileModuleService;
    logger.info(`[API] /admin/products/imports: File module disponível no container? ${fileModuleAvailable}`);
    if (fileModuleService) {
      logger.info(
        `[API] /admin/products/imports: File module métodos disponíveis: ${Object.keys(fileModuleService).join(', ')}`,
      );
    }
  } catch (e) {
    fileModuleAvailable = false;
    logger.error(`[API] /admin/products/imports: File module NÃO disponível no container: ${e}`);
    logger.error(
      `[API] /admin/products/imports: Erro ao resolver Modules.FILE: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  logger.info('[API] /admin/products/imports: ========================================');
  logger.info('[API] /admin/products/imports: 📥 Interceptando importação de produtos');
  logger.info(`[API] /admin/products/imports: Triggered by: ${req.auth_context?.actor_id || 'unknown'}`);
  logger.info(`[API] /admin/products/imports: Body recebido: ${JSON.stringify(req.body, null, 2)}`);
  logger.info(`[API] /admin/products/imports: Query params: ${JSON.stringify(req.query, null, 2)}`);
  logger.info(
    `[API] /admin/products/imports: Headers relevantes: x-execute=${req.headers['x-execute']}, x-action=${req.headers['x-action']}`,
  );

  // Verificar se é uma validação (após upload) ou importação real (botão Import clicado)
  // O Admin UI pode enviar um parâmetro ou header diferente para distinguir
  const body = req.body as ImportRequestBody;
  // O Admin UI chama esta rota após o upload para VALIDAR o arquivo e habilitar o botão Import
  // Por padrão, SEMPRE tratar como validação e retornar resposta que habilite o botão
  // Quando o botão Import for clicado, o Admin UI deve chamar novamente com algum indicador
  logger.info(`[API] /admin/products/imports: Modo: VALIDAÇÃO (retornar resposta que habilite o botão)`);
  logger.info(`[API] /admin/products/imports: Query params: ${JSON.stringify(req.query)}`);
  logger.info(
    `[API] /admin/products/imports: Headers: x-execute=${req.headers['x-execute']}, x-action=${req.headers['x-action']}`,
  );
  logger.info(`[API] /admin/products/imports: Body keys: ${Object.keys(body).join(', ')}`);

  // Garantir que diretório uploads existe
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info(`[API] /admin/products/imports: Diretório uploads criado: ${uploadsDir}`);
    } else {
      logger.info(`[API] /admin/products/imports: Diretório uploads já existe: ${uploadsDir}`);
      // Listar arquivos para debug
      try {
        const files = fs.readdirSync(uploadsDir);
        logger.info(
          `[API] /admin/products/imports: Arquivos em uploads/ (${files.length}): ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`,
        );
      } catch (e) {
        logger.warn(`[API] /admin/products/imports: Erro ao listar arquivos em uploads/: ${e}`);
      }
    }
  } catch (error) {
    logger.warn(`[API] /admin/products/imports: Não foi possível criar diretório uploads: ${error}`);
  }

  try {
    // O Admin UI envia o arquivo via upload para /admin/uploads e depois
    // chama esta rota com o file_id ou URL do arquivo no body
    // Vamos verificar diferentes formatos possíveis de body

    let fileContent: string;
    let filename: string = 'products.csv';

    // Tentar diferentes formatos de body que o Admin pode enviar
    const body = req.body as ImportRequestBody;

    logger.info(`[API] /admin/products/imports: Body completo: ${JSON.stringify(body, null, 2)}`);

    // Formato 1: { file_key: "xxx.csv" } - Tentar múltiplas estratégias para ler o arquivo
    if (body.file_key) {
      logger.info(`[API] /admin/products/imports: Arquivo via file_key: ${body.file_key}`);

      let fileRead = false;
      let lastError: Error | null = null;

      // Estratégia 1: Tentar usar o file module do MedusaJS (se o módulo estiver registrado)
      if (fileModuleAvailable && fileModuleService) {
        try {
          logger.info(`[API] /admin/products/imports: Tentando usar file module do MedusaJS...`);

          // O File Module expõe fileProviderService_ que contém fileProvider_ com os métodos do provider
          const fileProviderService = fileModuleService.fileProviderService_;

          if (fileProviderService) {
            logger.info(`[API] /admin/products/imports: File provider service encontrado`);
            logger.info(
              `[API] /admin/products/imports: Métodos do provider service: ${Object.keys(fileProviderService).join(', ')}`,
            );

            // Acessar o fileProvider_ dentro do fileProviderService_
            const fileProvider = fileProviderService.fileProvider_;

            if (fileProvider) {
              logger.info(`[API] /admin/products/imports: File provider encontrado`);
              logger.info(
                `[API] /admin/products/imports: Métodos do file provider: ${Object.keys(fileProvider).join(', ')}`,
              );

              // Tentar métodos específicos do provider local
              let fileBuffer: Buffer | null = null;

              // Método 1: Usar getUploadFilePath para obter o caminho do arquivo
              if (typeof fileProvider.getUploadFilePath === 'function') {
                logger.info(`[API] /admin/products/imports: Tentando fileProvider.getUploadFilePath(${body.file_key})`);
                try {
                  const filePath = await fileProvider.getUploadFilePath(body.file_key as string);
                  logger.info(`[API] /admin/products/imports: Caminho do arquivo obtido: ${filePath}`);
                  if (filePath && fs.existsSync(filePath)) {
                    fileBuffer = fs.readFileSync(filePath);
                    logger.info(
                      `[API] /admin/products/imports: ✅ Arquivo lido do caminho: ${filePath} (${fileBuffer.length} bytes)`,
                    );
                  } else {
                    logger.warn(`[API] /admin/products/imports: Arquivo não existe no caminho: ${filePath}`);
                  }
                } catch (e) {
                  logger.warn(`[API] /admin/products/imports: Erro em getUploadFilePath: ${e}`);
                }
              }

              // Método 2: Usar getUploadFileUrl para obter URL e baixar
              if (!fileBuffer && typeof fileProvider.getUploadFileUrl === 'function') {
                logger.info(`[API] /admin/products/imports: Tentando fileProvider.getUploadFileUrl(${body.file_key})`);
                try {
                  const fileUrl = await fileProvider.getUploadFileUrl(body.file_key as string);
                  logger.info(`[API] /admin/products/imports: URL obtida: ${fileUrl}`);
                  if (fileUrl) {
                    // Extrair token de autenticação do request atual
                    const authToken =
                      req.headers['x-medusa-access-token'] || req.headers['authorization']?.replace('Bearer ', '');
                    fileBuffer = await downloadFileFromUrl(fileUrl, logger, authToken as string);
                  }
                } catch (e) {
                  logger.warn(`[API] /admin/products/imports: Erro em getUploadFileUrl: ${e}`);
                }
              }

              // Método 3: Tentar usar uploadDir_ para construir caminho manualmente
              if (!fileBuffer && fileProvider && 'uploadDir_' in fileProvider) {
                try {
                  const uploadDir = (fileProvider as { uploadDir_?: string }).uploadDir_;
                  const filePath = path.join(uploadDir, body.file_key as string);
                  logger.info(`[API] /admin/products/imports: Tentando ler de uploadDir_: ${filePath}`);
                  if (fs.existsSync(filePath)) {
                    fileBuffer = fs.readFileSync(filePath);
                    logger.info(
                      `[API] /admin/products/imports: ✅ Arquivo lido de uploadDir_: ${filePath} (${fileBuffer.length} bytes)`,
                    );
                  } else {
                    logger.warn(`[API] /admin/products/imports: Arquivo não existe em uploadDir_: ${filePath}`);
                  }
                } catch (e) {
                  logger.warn(`[API] /admin/products/imports: Erro ao usar uploadDir_: ${e}`);
                }
              }

              // Método 4: Tentar usar privateUploadDir_ para construir caminho manualmente
              if (!fileBuffer && fileProvider && 'privateUploadDir_' in fileProvider) {
                try {
                  const privateUploadDir = (fileProvider as { privateUploadDir_?: string }).privateUploadDir_;
                  const filePath = path.join(privateUploadDir, body.file_key as string);
                  logger.info(`[API] /admin/products/imports: Tentando ler de privateUploadDir_: ${filePath}`);
                  if (fs.existsSync(filePath)) {
                    fileBuffer = fs.readFileSync(filePath);
                    logger.info(
                      `[API] /admin/products/imports: ✅ Arquivo lido de privateUploadDir_: ${filePath} (${fileBuffer.length} bytes)`,
                    );
                  } else {
                    logger.warn(`[API] /admin/products/imports: Arquivo não existe em privateUploadDir_: ${filePath}`);
                  }
                } catch (e) {
                  logger.warn(`[API] /admin/products/imports: Erro ao usar privateUploadDir_: ${e}`);
                }
              }

              if (fileBuffer) {
                fileContent = fileBuffer.toString('base64');
                filename = (body.originalname as string) || (body.file_key as string).split('/').pop() || filename;
                fileRead = true;
                logger.info(
                  `[API] /admin/products/imports: ✅ Arquivo processado via file provider: ${filename} (${fileBuffer.length} bytes)`,
                );
              } else {
                logger.warn(
                  `[API] /admin/products/imports: File provider não retornou buffer após tentar todos os métodos`,
                );
              }
            } else {
              logger.warn(`[API] /admin/products/imports: fileProvider_ não encontrado no fileProviderService_`);
            }
          } else {
            logger.warn(`[API] /admin/products/imports: fileProviderService_ não encontrado no file module`);
          }
        } catch (fileError) {
          logger.warn(`[API] /admin/products/imports: Erro ao buscar arquivo via file module: ${fileError}`);
          lastError = fileError instanceof Error ? fileError : new Error(String(fileError));
        }
      } else {
        logger.warn(`[API] /admin/products/imports: File module não disponível - pulando estratégia 1`);
      }

      // Estratégia 2: Tentar ler do sistema de arquivos local (uploads/)
      // O provider local salva arquivos em uploads/ com o file_key como nome
      if (!fileRead) {
        try {
          // Tentar múltiplos caminhos possíveis
          const possibleDirs = [
            path.join(process.cwd(), 'uploads'),
            path.join(process.cwd(), 'storage', 'uploads'),
            path.join(process.cwd(), 'tmp', 'uploads'),
          ];

          logger.info(`[API] /admin/products/imports: Tentando ler arquivo local com file_key: ${body.file_key}`);

          for (const uploadsDir of possibleDirs) {
            const filePath = path.join(uploadsDir, body.file_key);
            logger.info(`[API] /admin/products/imports: Verificando caminho: ${filePath}`);
            if (fs.existsSync(filePath)) {
              logger.info(`[API] /admin/products/imports: ✅ Arquivo encontrado! Lendo: ${filePath}`);
              const fileBuffer = fs.readFileSync(filePath);
              fileContent = fileBuffer.toString('base64');
              filename = body.originalname || body.file_key.split('/').pop() || filename;
              fileRead = true;
              logger.info(
                `[API] /admin/products/imports: ✅ Arquivo lido do sistema de arquivos: ${filename} (${fileBuffer.length} bytes)`,
              );
              break;
            } else {
              logger.info(`[API] /admin/products/imports: Arquivo não encontrado em: ${filePath}`);
            }
          }

          // Se não encontrou, listar arquivos no diretório uploads para debug
          if (!fileRead && fs.existsSync(path.join(process.cwd(), 'uploads'))) {
            const filesInUploads = fs.readdirSync(path.join(process.cwd(), 'uploads'));
            logger.info(
              `[API] /admin/products/imports: Arquivos em uploads/: ${filesInUploads.slice(0, 10).join(', ')}`,
            );
          }
        } catch (error) {
          logger.warn(`[API] /admin/products/imports: Erro ao ler arquivo local: ${error}`);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      // Estratégia 3: Tentar baixar da URL do Medusa Admin (/admin/uploads/[file_key])
      if (!fileRead) {
        try {
          // O Admin UI faz upload para /admin/uploads e o arquivo pode ser acessado via essa rota
          const adminUrl = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
          const fileUrl = `${adminUrl}/admin/uploads/${body.file_key as string}`;
          logger.info(`[API] /admin/products/imports: Tentando baixar de URL do Admin: ${fileUrl}`);

          // Extrair token de autenticação do request atual
          const authToken =
            req.headers['x-medusa-access-token'] || req.headers['authorization']?.replace('Bearer ', '');

          const fileBuffer = await downloadFileFromUrl(fileUrl, logger, authToken as string);
          fileContent = fileBuffer.toString('base64');
          filename = body.originalname || body.file_key.split('/').pop() || filename;
          fileRead = true;
          logger.info(
            `[API] /admin/products/imports: ✅ Arquivo baixado de URL do Admin: ${filename} (${fileBuffer.length} bytes)`,
          );
        } catch (error) {
          logger.warn(`[API] /admin/products/imports: Erro ao baixar de URL do Admin: ${error}`);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      // Estratégia 4: Tentar baixar da URL pública (S3_FILE_URL + file_key)
      if (!fileRead) {
        try {
          const s3FileUrl = process.env.S3_FILE_URL;
          if (s3FileUrl) {
            const baseS3Url = s3FileUrl.endsWith('/') ? s3FileUrl.slice(0, -1) : s3FileUrl;
            const fileUrl = `${baseS3Url}/${body.file_key as string}`;
            logger.info(`[API] /admin/products/imports: Tentando baixar de URL pública: ${fileUrl}`);
            const fileBuffer = await downloadFileFromUrl(fileUrl, logger);
            fileContent = fileBuffer.toString('base64');
            filename = body.originalname || body.file_key.split('/').pop() || filename;
            fileRead = true;
            logger.info(
              `[API] /admin/products/imports: ✅ Arquivo baixado de URL pública: ${filename} (${fileBuffer.length} bytes)`,
            );
          }
        } catch (error) {
          logger.warn(`[API] /admin/products/imports: Erro ao baixar de URL pública: ${error}`);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      // Estratégia 5: Tentar ler diretamente do S3/MinIO usando AWS SDK (se credenciais estiverem configuradas)
      if (!fileRead) {
        try {
          const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
          const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
          const s3Endpoint = process.env.S3_ENDPOINT;
          const s3Region = process.env.S3_REGION || 'us-east-1';
          const s3Bucket = process.env.S3_BUCKET || 'medusa';
          const s3ForcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

          if (s3AccessKeyId && s3SecretAccessKey) {
            logger.info(
              `[API] /admin/products/imports: Tentando ler do S3/MinIO: ${s3Bucket}/${body.file_key as string}`,
            );

            // Criar cliente S3
            const s3Client = new S3Client({
              region: s3Region,
              endpoint: s3Endpoint,
              credentials: {
                accessKeyId: s3AccessKeyId,
                secretAccessKey: s3SecretAccessKey,
              },
              forcePathStyle: s3ForcePathStyle,
            });

            // Baixar arquivo do S3
            const getObjectCommand = new GetObjectCommand({
              Bucket: s3Bucket,
              Key: body.file_key as string,
            });

            const s3Response = await s3Client.send(getObjectCommand);

            if (!s3Response.Body) {
              throw new Error('File body is empty');
            }

            // Converter stream para buffer
            const chunks: Buffer[] = [];
            if (s3Response.Body && typeof s3Response.Body === 'object' && Symbol.asyncIterator in s3Response.Body) {
              for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
                chunks.push(Buffer.from(chunk));
              }
            }
            const fileBuffer = Buffer.concat(chunks);

            fileContent = fileBuffer.toString('base64');
            filename = body.originalname || body.file_key.split('/').pop() || filename;
            fileRead = true;
            logger.info(
              `[API] /admin/products/imports: ✅ Arquivo lido do S3/MinIO: ${filename} (${fileBuffer.length} bytes)`,
            );
          }
        } catch (error) {
          logger.warn(`[API] /admin/products/imports: Erro ao ler do S3: ${error}`);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      // Se nenhuma estratégia funcionou, lançar erro com instruções
      if (!fileRead) {
        logger.error(`[API] /admin/products/imports: ❌ Não foi possível ler o arquivo usando nenhuma estratégia`);
        logger.error(`[API] /admin/products/imports: Último erro: ${lastError?.message || 'N/A'}`);
        logger.error(`[API] /admin/products/imports: ========================================`);
        logger.error(`[API] /admin/products/imports: CONFIGURAÇÃO NECESSÁRIA:`);
        logger.error(`[API] /admin/products/imports: Para desenvolvimento local, configure uma das opções:`);
        logger.error(`[API] /admin/products/imports: 1. S3/MinIO local:`);
        logger.error(`[API] /admin/products/imports:    S3_ACCESS_KEY_ID=minioadmin`);
        logger.error(`[API] /admin/products/imports:    S3_SECRET_ACCESS_KEY=minioadmin`);
        logger.error(`[API] /admin/products/imports:    S3_BUCKET=medusa-uploads`);
        logger.error(`[API] /admin/products/imports:    S3_ENDPOINT=http://localhost:9001`);
        logger.error(`[API] /admin/products/imports:    S3_REGION=us-east-1`);
        logger.error(`[API] /admin/products/imports:    S3_FILE_URL=http://localhost:9001/medusa-uploads`);
        logger.error(`[API] /admin/products/imports:    S3_FORCE_PATH_STYLE=true`);
        logger.error(`[API] /admin/products/imports: 2. Ou configure S3_FILE_URL para URL pública do storage`);
        logger.error(`[API] /admin/products/imports: ========================================`);
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Failed to read file from storage. File Module not configured. Please configure S3/MinIO credentials or S3_FILE_URL in your .env file. See logs for details.`,
        );
      }
    }
    // Formato 2: { file_id: "file_xxx" } - Usar file module do MedusaJS
    else if (body.file_id) {
      logger.info(`[API] /admin/products/imports: Arquivo via file_id: ${body.file_id}`);
      try {
        if (!fileModuleAvailable || !fileModuleService) {
          throw new Error('File module not available');
        }

        let file: FileInfo | null = null;

        if (fileModuleService.retrieve && typeof fileModuleService.retrieve === 'function') {
          file = await fileModuleService.retrieve(body.file_id as string);
        } else if (fileModuleService.getFile && typeof fileModuleService.getFile === 'function') {
          file = await fileModuleService.getFile(body.file_id as string);
        }

        if (file && file.url) {
          logger.info(`[API] /admin/products/imports: Baixando arquivo de: ${file.url}`);
          const fileBuffer = await downloadFileFromUrl(file.url, logger);
          fileContent = fileBuffer.toString('base64');
          filename = file.name || file.url.split('/').pop() || filename;
        } else {
          throw new Error('File URL not found');
        }
      } catch (error) {
        logger.error(`[API] /admin/products/imports: Erro ao resolver file_id: ${error}`);
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Failed to resolve file_id: ${error}`);
      }
    }
    // Formato 2: { file_url: "https://..." }
    else if (body.file_url) {
      logger.info(`[API] /admin/products/imports: Arquivo via URL: ${body.file_url}`);
      const fileBuffer = await downloadFileFromUrl(body.file_url as string, logger);
      fileContent = fileBuffer.toString('base64');
      filename = (body.file_url as string).split('/').pop() || filename;
    }
    // Formato 3: { fileContent: "base64..." }
    else if (body.fileContent) {
      logger.info('[API] /admin/products/imports: Arquivo via fileContent (base64)');
      fileContent = body.fileContent as string;
      filename = (body.filename as string) || filename;
    }
    // Formato 4: { file: { url: "https://..." } }
    else if (body.file?.url) {
      logger.info(`[API] /admin/products/imports: Arquivo via file.url: ${body.file.url}`);
      const fileBuffer = await downloadFileFromUrl((body.file?.url as string) || '', logger);
      fileContent = fileBuffer.toString('base64');
      filename = (body.file?.name as string) || filename;
    }
    // Formato 5: { file: { id: "file_xxx" } }
    else if (body.file?.id) {
      logger.info(`[API] /admin/products/imports: Arquivo via file.id: ${body.file.id}`);
      try {
        if (!fileModuleAvailable || !fileModuleService) {
          throw new Error('File module not available');
        }

        let file: FileInfo | null = null;

        if (fileModuleService.retrieve && typeof fileModuleService.retrieve === 'function') {
          file = await fileModuleService.retrieve(body.file_id as string);
        } else if (fileModuleService.getFile && typeof fileModuleService.getFile === 'function') {
          file = await fileModuleService.getFile(body.file_id as string);
        }

        if (file && file.url) {
          const fileBuffer = await downloadFileFromUrl(file.url as string, logger);
          fileContent = fileBuffer.toString('base64');
          filename = (file.name as string) || filename;
        } else {
          throw new Error('File URL not found');
        }
      } catch (error) {
        logger.error(`[API] /admin/products/imports: Erro ao resolver file.id: ${error}`);
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Failed to resolve file.id: ${error}`);
      }
    }
    // Formato 6: Tentar multipart/form-data (fallback)
    else {
      const file = (req as { file?: Express.Multer.File }).file;
      if (file) {
        logger.info(`[API] /admin/products/imports: Arquivo via multipart/form-data: ${file.originalname}`);
        fileContent = file.buffer.toString('base64');
        filename = file.originalname;
      } else {
        logger.error('[API] /admin/products/imports: ❌ Nenhum arquivo encontrado no body');
        logger.error(`[API] /admin/products/imports: Body keys: ${Object.keys(body).join(', ')}`);
        logger.error(`[API] /admin/products/imports: Body completo: ${JSON.stringify(body, null, 2)}`);
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'No file was uploaded. Expected file_id, file_url, fileContent, file.url, file.id, or multipart file.',
        );
      }
    }

    logger.info(`[API] /admin/products/imports: ✅ Arquivo processado: ${filename}`);
    logger.info(`[API] /admin/products/imports: Tamanho (base64): ${fileContent.length} caracteres`);

    // Extrair categoryMapping do CSV original ANTES de executar o workflow
    // Isso garante que o hook productsCreated tenha acesso ao categoryMapping
    // mesmo se o batchProductsWorkflow não propagar o additional_data corretamente
    let categoryMapping: Record<string, string> | undefined;
    try {
      const csvContent = Buffer.from(fileContent, 'base64').toString('utf-8');
      const lines = csvContent.split('\n').filter((line) => line.trim());
      if (lines.length > 0) {
        // Parse do cabeçalho
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const categoryColumnIndex = headers.indexOf('Product Category');

        if (categoryColumnIndex !== -1) {
          logger.info(`[API] /admin/products/imports: Extraindo categoryMapping do CSV...`);
          categoryMapping = {};

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Parse CSV linha (suportando aspas)
            const values: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                if (inQuotes && line[j + 1] === '"') {
                  // Escaped quote
                  current += '"';
                  j++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            if (current) values.push(current.trim().replace(/^"|"$/g, ''));

            if (values.length <= categoryColumnIndex) {
              logger.warn(
                `[API] /admin/products/imports: Linha ${i} tem apenas ${values.length} colunas, esperado pelo menos ${categoryColumnIndex + 1}`,
              );
              continue;
            }

            const categoryPath = values[categoryColumnIndex];
            if (!categoryPath) {
              logger.warn(
                `[API] /admin/products/imports: Linha ${i} não tem categoria na coluna ${categoryColumnIndex}`,
              );
              continue;
            }

            const handleIndex = headers.indexOf('Product Handle');
            const productHandle = handleIndex >= 0 && handleIndex < values.length ? values[handleIndex] : null;

            if (productHandle && categoryPath) {
              categoryMapping[productHandle] = categoryPath;
              logger.info(`[API] /admin/products/imports: Mapeado: ${productHandle} -> ${categoryPath}`);
            } else {
              logger.warn(
                `[API] /admin/products/imports: Linha ${i} não tem handle ou categoria válida (handle: ${productHandle}, categoria: ${categoryPath})`,
              );
            }
          }

          logger.info(
            `[API] /admin/products/imports: ✅ categoryMapping extraído: ${Object.keys(categoryMapping).length} produtos`,
          );
          logger.info(`[API] /admin/products/imports: Handles mapeados: ${Object.keys(categoryMapping).join(', ')}`);
        } else {
          logger.info('[API] /admin/products/imports: Coluna "Product Category" não encontrada no CSV');
        }
      }
    } catch (error) {
      logger.warn(`[API] /admin/products/imports: Erro ao extrair categoryMapping: ${error}`);
    }

    // SEMPRE tratar como validação na primeira chamada (após upload)
    // Retornar resposta que habilite o botão Import no Admin UI
    // O Admin UI espera um formato específico para habilitar o botão
    logger.info('[API] /admin/products/imports: ⚠️ Modo validação - normalizando CSV e preparando resposta');

    // Executar workflow customizado que substitui o normalizeCsvStep
    // Este workflow já processa categorias e retorna o summary correto
    // IMPORTANTE: O workflow vai esperar confirmação, então vamos obter apenas o transaction_id e summary
    logger.info('[API] /admin/products/imports: 🚀 Executando importProductsWithCategoriesWorkflow...');

    const workflowResult = await importProductsWithCategoriesWorkflow(req.scope).run({
      input: {
        fileContent,
        filename,
        additional_data: {
          triggered_by: req.auth_context?.actor_id,
        },
      },
    });

    // Logar o resultado completo do workflow para debug
    logger.info(`[API] /admin/products/imports: Workflow result completo: ${JSON.stringify(workflowResult, null, 2)}`);

    // O workflow retorna { transaction: { transactionId }, result: { summary } }
    // Mas pode retornar de diferentes formas, vamos tentar todas as possibilidades
    const workflowResultTyped = workflowResult as {
      transaction?: { transactionId?: string };
      transactionId?: string;
      transaction_id?: string;
      result?: { summary?: unknown } | unknown;
      summary?: unknown;
    };
    const transactionId =
      workflowResultTyped?.transaction?.transactionId ||
      workflowResultTyped?.transactionId ||
      workflowResultTyped?.transaction_id;

    // O summary pode estar em diferentes lugares
    const summary =
      (workflowResultTyped?.result as { summary?: unknown })?.summary ||
      workflowResultTyped?.summary ||
      workflowResultTyped?.result ||
      {};

    if (!transactionId) {
      logger.error('[API] /admin/products/imports: ❌ Workflow não retornou transaction_id');
      logger.error(`[API] /admin/products/imports: Workflow result: ${JSON.stringify(workflowResult, null, 2)}`);
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'Workflow did not return transaction_id');
    }

    logger.info(`[API] /admin/products/imports: ✅ Transaction_id obtido: ${transactionId}`);
    logger.info(`[API] /admin/products/imports: Summary: ${JSON.stringify(summary, null, 2)}`);

    // Garantir que o transaction_id seja uma string limpa (sem espaços ou caracteres extras)
    const cleanTransactionId = String(transactionId).trim();

    // Armazenar informações do arquivo original no cache para uso na rota de confirmação
    addFileToCache(cleanTransactionId, {
      file_key: (body.file_key as string) || (body.file_id as string) || '',
      filename,
      fileContent, // CSV original em base64 (não usado, mas mantido para compatibilidade)
    });

    // Armazenar categoryMapping no cache para uso no hook productsCreated
    // Isso garante que o hook tenha acesso ao categoryMapping mesmo se o batchProductsWorkflow
    // não propagar o additional_data corretamente
    if (categoryMapping && Object.keys(categoryMapping).length > 0) {
      logger.info(
        `[API] /admin/products/imports: Armazenando categoryMapping no cache para transaction_id: ${cleanTransactionId}`,
      );
      addCategoryMappingToCache(cleanTransactionId, categoryMapping);

      // Também armazenar por handle de cada produto (fallback caso transaction_id não esteja disponível no hook)
      for (const [productHandle] of Object.entries(categoryMapping)) {
        addCategoryMappingToCache(productHandle, categoryMapping);
        logger.info(
          `[API] /admin/products/imports: Armazenando categoryMapping no cache para handle: ${productHandle}`,
        );
      }
    }

    // Extrair toCreate e toUpdate do summary
    // O summary pode ter diferentes formatos, vamos normalizar
    const summaryTyped = summary as {
      toCreate?: number;
      to_create?: number;
      created?: number;
      toUpdate?: number;
      to_update?: number;
      updated?: number;
      errors?: unknown[];
      error?: unknown[];
    };
    const normalizedSummary = {
      toCreate: summaryTyped.toCreate || summaryTyped.to_create || summaryTyped.created || 0,
      toUpdate: summaryTyped.toUpdate || summaryTyped.to_update || summaryTyped.updated || 0,
      errors: summaryTyped.errors || summaryTyped.error || [],
    };

    // Se o summary estiver completamente vazio, tentar contar do CSV original
    if (normalizedSummary.toCreate === 0 && normalizedSummary.toUpdate === 0) {
      try {
        const csvContent = Buffer.from(fileContent, 'base64').toString('utf-8');
        const lines = csvContent.split('\n').filter((line) => line.trim());
        // Subtrair 1 para o header
        const productCount = Math.max(0, lines.length - 1);
        // Assumir que são novos produtos se não houver Product Id preenchido
        normalizedSummary.toCreate = productCount;
        logger.info(`[API] /admin/products/imports: ⚠️ Summary vazio, estimando ${productCount} produtos para criar`);
      } catch (e) {
        logger.warn(`[API] /admin/products/imports: Não foi possível estimar produtos do CSV: ${e}`);
      }
    }

    // Retornar resposta no formato esperado pelo Admin UI
    // O Admin UI espera transaction_id e summary conforme documentação
    const validationResponse: {
      transaction_id: string;
      summary: { toCreate: number; toUpdate: number; errors: unknown[] };
    } = {
      transaction_id: cleanTransactionId,
      summary: normalizedSummary,
    };

    logger.info(`[API] /admin/products/imports: Resposta de validação: ${JSON.stringify(validationResponse, null, 2)}`);
    logger.info('[API] /admin/products/imports: ========================================');

    return res.status(200).json(validationResponse);

    // Se for importação real (botão Import clicado), executar o workflow
    logger.info(
      '[API] /admin/products/imports: 🚀 Executando workflow customizado com normalizeCsvStep substituído...',
    );

    const { result } = await importProductsWithCategoriesWorkflow(req.scope).run({
      input: {
        fileContent,
        filename,
        additional_data: {
          triggered_by: req.auth_context?.actor_id,
        },
      },
    });

    logger.info('[API] /admin/products/imports: ========================================');
    logger.info('[API] /admin/products/imports: ✅ Importação concluída com sucesso!');
    logger.info(`[API] /admin/products/imports: Resultado: ${JSON.stringify(result, null, 2)}`);
    logger.info('[API] /admin/products/imports: ========================================');

    // Retornar resposta no formato esperado pelo Admin UI
    // O Admin UI espera um objeto com id, job_id ou transaction_id
    // Se o resultado estiver vazio ou não tiver os campos esperados, criar um formato padrão
    const resultTyped = result as WorkflowResponse | null | undefined;
    const response: WorkflowResponse =
      result && typeof result === 'object' && Object.keys(result).length > 0
        ? (result as WorkflowResponse)
        : {
            id: resultTyped?.id || resultTyped?.job_id || resultTyped?.transaction_id || `import_${Date.now()}`,
            status: 'completed',
            result: {
              stats: resultTyped?.result?.stats || {
                created: 0,
                updated: 0,
                errors: [],
              },
            },
            categories_processed: true,
          };

    // Garantir que sempre temos um id/job_id
    if (!response.id && !response.job_id && !response.transaction_id) {
      response.id = `import_${Date.now()}`;
    }

    logger.info(`[API] /admin/products/imports: Resposta final: ${JSON.stringify(response, null, 2)}`);

    // Garantir que sempre retornamos um objeto válido
    res.status(200).json(response);
  } catch (error) {
    logger.error('[API] /admin/products/imports: ========================================');
    logger.error('[API] /admin/products/imports: ❌ ERRO na importação');
    logger.error(`[API] /admin/products/imports: Erro: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logger.error(`[API] /admin/products/imports: Stack: ${error.stack}`);
    }
    logger.error('[API] /admin/products/imports: ========================================');
    throw error;
  }
};
