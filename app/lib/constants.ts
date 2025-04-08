// Call pricing in euros
export const CALL_COST_PER_MINUTE = 0.20;
export const CALL_COST_PER_SECOND = CALL_COST_PER_MINUTE / 60; // 0.00333... euros per second

export interface Variable {
    name: string;
    type: 'String' | 'Boolean' | 'Datetime' | 'Number';
    source: 'built-in' | 'CSV input' | 'custom';
    isBuiltIn: boolean;
}

export const builtInVariables: Variable[] = [
    { name: 'from_number', type: 'String', source: 'built-in', isBuiltIn: true },
    { name: 'to_number', type: 'String', source: 'built-in', isBuiltIn: true },
    { name: 'call_start_time', type: 'Datetime', source: 'built-in', isBuiltIn: true },
    { name: 'call_id', type: 'String', source: 'built-in', isBuiltIn: true }
];  
