import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import * as fs from 'fs';
import * as path from 'path';
import { IncomingForm } from 'formidable';
import { promisify } from 'util';

import { importDisfrutaCatalogWorkflow } from '../../../../workflows/import-disfruta/import-disfruta-workflow';

export const config = {
  api: {
    bodyParser: false, // Desabilita body parser padrão para multipart
  },
};

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    // Parse multipart/form-data
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), 'tmp'),
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
    });

    const parseForm = promisify(form.parse.bind(form));
    const [fields, files] = await parseForm(req);

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({
        error: 'Arquivo não fornecido. Use o campo "file" no form-data.',
      });
    }

    // Valida extensão
    const ext = path.extname(uploadedFile.originalFilename || uploadedFile.filepath).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      // Remove arquivo temporário
      if (fs.existsSync(uploadedFile.filepath)) {
        fs.unlinkSync(uploadedFile.filepath);
      }
      return res.status(400).json({
        error: 'Formato de arquivo inválido. Apenas arquivos Excel (.xlsx, .xls) são aceitos.',
      });
    }

    // Extrai IDs opcionais do body
    const salesChannelId = Array.isArray(fields.salesChannelId) 
      ? fields.salesChannelId[0] 
      : fields.salesChannelId;
    const shippingProfileId = Array.isArray(fields.shippingProfileId)
      ? fields.shippingProfileId[0]
      : fields.shippingProfileId;

    // Executa workflow
    const { result } = await importDisfrutaCatalogWorkflow(req.scope).run({
      input: {
        filePath: uploadedFile.filepath,
        salesChannelId: salesChannelId as string | undefined,
        shippingProfileId: shippingProfileId as string | undefined,
      },
    });

    // Remove arquivo temporário após processamento
    if (fs.existsSync(uploadedFile.filepath)) {
      fs.unlinkSync(uploadedFile.filepath);
    }

    res.json({
      success: true,
      total_products: result.total,
      products: result.products,
      message: `Importados ${result.total} produtos com sucesso`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao processar importação',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
