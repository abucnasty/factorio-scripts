import { EntityType } from "../../entity-type";

export type InserterTargetEntityType = Exclude<EntityType, typeof EntityType.INSERTER>;