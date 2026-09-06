import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import ManualShippingProviderService from "./service";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ManualShippingProviderService],
});
