import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const { id: productId } = req.params;
    const body = req.body as { add?: string[]; remove?: string[] };

    const linkModule = req.scope.resolve(ContainerRegistrationKeys.LINK);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL);

    try {
      await productService.retrieveProduct(productId);
    } catch {
      res.status(404).json({ message: `Product with id ${productId} not found` });
      return;
    }

    if (body.add?.length) {
      for (const scId of body.add) {
        try {
          if (typeof salesChannelService.retrieveSalesChannel === 'function') {
            await salesChannelService.retrieveSalesChannel(scId);
          } else {
            const channels = await salesChannelService.listSalesChannels({ id: scId });
            if (!channels?.length) continue;
          }

          await linkModule.create({
            [Modules.PRODUCT]: { product_id: productId },
            [Modules.SALES_CHANNEL]: { sales_channel_id: scId },
          });
        } catch {
          continue;
        }
      }
    }

    if (body.remove?.length) {
      for (const scId of body.remove) {
        try {
          await linkModule.delete({
            [Modules.PRODUCT]: { product_id: productId },
            [Modules.SALES_CHANNEL]: { sales_channel_id: scId },
          });
        } catch {
          continue;
        }
      }
    }

    res.json({ message: 'Sales channels updated successfully', product_id: productId });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating product sales channels',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
