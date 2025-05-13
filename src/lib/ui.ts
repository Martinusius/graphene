import type { PropertyConfig } from "src/EditorInterface";
import type { AuxiliaryType } from "./core/interface/Auxiliary";

export function getPropertyOfTypeNames(propertyConfig: PropertyConfig, type: AuxiliaryType) {
  return Object.entries(propertyConfig.properties).filter(([_, property]) => property.type === type).map(([name]) => name);
}