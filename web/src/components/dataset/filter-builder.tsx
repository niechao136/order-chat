'use client';

import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { FilterCondition, FilterOperator, FieldType } from '@/types/dataset';

interface FilterBuilderProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  availableFields?: string[];
  fieldTypes?: Record<string, FieldType>; // 字段名 -> 字段类型
}

export const OPERATOR_FOR_TYPE: Record<FieldType, FilterOperator[]> = {
  string: ['eq', 'ne', 'in', 'nin', 'like'],
  number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'],
  boolean: ['eq', 'ne'],
  array: ['in', 'nin'],
  object: ['in', 'nin'],
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: '等于',
  ne: '不等于',
  gt: '大于',
  gte: '大于等于',
  lt: '小于',
  lte: '小于等于',
  in: '包含于',
  nin: '不包含于',
  like: '相似',
};

export function FilterBuilder({ conditions, onChange, availableFields = [], fieldTypes = {} }: FilterBuilderProps) {

  const addCondition = () => {
    onChange(conditions.concat([{ field: '', operator: 'eq', value: '' }]));
  };

  const removeCondition = (index: number) => {
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    onChange(newConditions);
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const newConditions = [...conditions];
    const oldCond = newConditions[index];
    const newCond = { ...oldCond, ...updates };

     // 如果字段改变，自动将操作符重置为该类型支持的第一个操作符，并清空值
    if (updates.field !== undefined && updates.field !== oldCond.field) {
      const fieldType = fieldTypes[updates.field];
      const allowedOps = fieldType ? OPERATOR_FOR_TYPE[fieldType] : [];
      newCond.operator = allowedOps[0] || 'eq';
      newCond.value = fieldType === 'boolean' ? false : '';
    }

    // 如果操作符改变且新操作符不适合当前值类型，可选择性重置值（此处交给用户处理）
    newConditions[index] = newCond;
    onChange(newConditions);
  };

  const parseValue = (value: string, fieldType?: FieldType): unknown => {
    if (fieldType === 'number') {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    if (fieldType === 'boolean') {
      return value === 'true';
    }
    return value;
  };

  const renderValueInput = (cond: FilterCondition, idx: number, fieldType?: FieldType) => {

    // 布尔值使用 Switch
    if (fieldType === 'boolean') {
      return (
        <div className="flex items-center gap-2 flex-1 min-w-25">
          <Switch
            checked={!!cond.value}
            onCheckedChange={(checked) => updateCondition(idx, { value: checked })}
          />
          <span className="text-sm text-muted-foreground">
            {cond.value ? 'true' : 'false'}
          </span>
        </div>
      );
    }

    return (
      <Input
        placeholder={'值'}
        type={fieldType === 'number' ? 'number' : 'text'}
        value={String(cond.value ?? '')}
        onChange={(e) => {
          const parsed = parseValue(e.target.value, fieldType);
          updateCondition(idx, { value: parsed });
        }}
        className="flex-1 min-w-30"
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">筛选条件（AND 逻辑）</span>
        <Button variant="outline" size="sm" onClick={addCondition}>
          <PlusIcon className="h-4 w-4 mr-1"/>
          添加条件
        </Button>
      </div>
      {conditions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">暂无筛选条件</p>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond, idx) => {
            const fieldType = fieldTypes[cond.field];
            const allowedOperators = fieldType
              ? OPERATOR_FOR_TYPE[fieldType]
              : Object.keys(OPERATOR_LABELS) as FilterOperator[];

            return (
              <div key={idx} className="flex items-center gap-2">
                {/* 字段名下拉 */}
                <Select
                  value={cond.field}
                  onValueChange={(v) => updateCondition(idx, { field: v })}
                >
                  <SelectTrigger className="flex-1 min-w-25">
                    <SelectValue placeholder={availableFields.length === 0 ? "暂无可用字段" : "选择字段"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field} value={field}>
                        {field}
                        {fieldTypes[field] && (
                          <span className="ml-2 text-xs text-muted-foreground">
                              ({fieldTypes[field]})
                            </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 操作符下拉（根据字段类型过滤） */}
                <Select
                  value={cond.operator}
                  onValueChange={(v) => updateCondition(idx, { operator: v as FilterOperator })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    {allowedOperators.map(op => (
                      <SelectItem key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 值输入（根据类型渲染不同控件） */}
                {renderValueInput(cond, idx, fieldType)}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => removeCondition(idx)}
                >
                  <Trash2Icon className="h-4 w-4"/>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
