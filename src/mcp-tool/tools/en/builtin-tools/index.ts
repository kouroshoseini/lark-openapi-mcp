import { docxBuiltinToolName, docxBuiltinTools } from './docx/builtin';
import { imBuiltinToolName, imBuiltinTools } from './im/buildin';
import { okrBuiltinToolName, okrBuiltinTools } from './okr/builtin';

export const BuiltinTools = [...docxBuiltinTools, ...imBuiltinTools, ...okrBuiltinTools];

export type BuiltinToolName = docxBuiltinToolName | imBuiltinToolName | okrBuiltinToolName;
