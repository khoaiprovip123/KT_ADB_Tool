export type TweakCategory =
  | "debloat"
  | "display"
  | "security"
  | "game"
  | "animations"
  | "controls"
  | "multitasking";

export type RiskLevel = "SAFE" | "RISKY" | "KEEP";

export type PkgStatus = "installed" | "disabled" | "uninstalled";

export interface BloatwareEntry {
  package: string;
  name: string;
  description: string;
  risk: RiskLevel;
  category: string;
  preferDisable?: boolean;
  status: PkgStatus;
}
