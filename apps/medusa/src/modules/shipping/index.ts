import { Module } from "@medusajs/framework/utils";
import ShippingModuleService from "./service";

export const SHIPPING_MODULE = "shipping_zones";

export default Module(SHIPPING_MODULE, {
  service: ShippingModuleService,
});
