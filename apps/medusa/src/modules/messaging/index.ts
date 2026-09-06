import { Module } from "@medusajs/framework/utils";
import MessagingModuleService from "./service";

export const MESSAGING_MODULE = "messaging";

export default Module(MESSAGING_MODULE, {
  service: MessagingModuleService,
});
