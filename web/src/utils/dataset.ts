import { FieldItem } from '@/types/dataset';

export const PRESET_FIELDS: FieldItem[] = [
  {
    field_name: 'content',
    field_type: 'string',
    is_required: true,
    default_value: '',
    description: '向量内容（系统预设）',
  },
  {
    field_name: 'updated_at',
    field_type: 'number',
    is_required: true,
    default_value: '',
    description: '更新时间（系统预设）',
  },
];

export const PRESET_FIELD_NAME = PRESET_FIELDS.map(o => o.field_name);

export const isPresetField = (fieldName: string) =>
  PRESET_FIELD_NAME.includes(fieldName);
