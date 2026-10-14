// Retained CLI signatures delegate to the shared standard exporter; Profile remains owned by step01.
import {PROFILE} from '../src/profile.js';
import {assembleExport as assemble, exportRequest as requestExport} from '@tileset/pack-export';
import type {ExportInput, BuildContext} from '@tileset/pack-export';
export {archiveFixture,replayArchives,jsonBytes,currentBuildContext,decodeAtlas,readPackExport,publishDirectory} from '@tileset/pack-export';
export type {RecipeArchive,ExportInput,BuildContext} from '@tileset/pack-export';
export function assembleExport(input: ExportInput, context: BuildContext) { return assemble(PROFILE,input,context); }
export function exportRequest(request: unknown, context: BuildContext) { return requestExport(PROFILE,request,context); }
