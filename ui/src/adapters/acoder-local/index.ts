import type { UIAdapterModule } from "../types";
import { parseAcoderStdoutLine } from "@paperclipai/adapter-acoder-local/ui";
import { AcoderLocalConfigFields } from "./config-fields";
import { buildAcoderLocalConfig } from "@paperclipai/adapter-acoder-local/ui";

export const acoderLocalUIAdapter: UIAdapterModule = {
  type: "acoder_local",
  label: "A-Coder CLI",
  parseStdoutLine: parseAcoderStdoutLine,
  ConfigFields: AcoderLocalConfigFields,
  buildAdapterConfig: buildAcoderLocalConfig,
};