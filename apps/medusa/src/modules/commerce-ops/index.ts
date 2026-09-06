import { Module } from "@medusajs/framework/utils";
import CommerceOpsModuleService from "./service";

export const COMMERCE_OPS_MODULE = "commerce_ops";

export default Module(COMMERCE_OPS_MODULE, {
  service: CommerceOpsModuleService,
});
