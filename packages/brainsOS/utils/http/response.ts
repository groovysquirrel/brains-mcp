import { AwsApiResponse, CommandResultResponse } from '../../core/types/api/baseTypes';
import { flatten } from 'flat';

export function createResponse(
    statusCode: number, 
    body: CommandResultResponse
): AwsApiResponse {

    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    };
}


export function createFlattenedResponse(
    statusCode: number, 
    body: CommandResultResponse
): AwsApiResponse {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(flatten(body))
    };
}


interface FlattenOptions {
    stringifyArrays?: boolean;
    componentTypeKey?: string;
    prettyPrint?: boolean;
}

export function flattenObject(
    obj: any, 
    options: FlattenOptions = {
        stringifyArrays: true,
        prettyPrint: true
    },
    prefix = ''
): Record<string, any> {
    console.log('Flattening object:', JSON.stringify(obj, null, 2));
    
    return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
        const prefixedKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (value === null) {
            acc[prefixedKey] = null;
        }
        // Handle arrays
        else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(acc, flattenObject(item, options, `${prefixedKey}.${index}`));
                } else {
                    acc[`${prefixedKey}.${index}`] = item;
                }
            });
        }
        // Handle nested objects
        else if (typeof value === 'object' && value !== null) {
            Object.assign(acc, flattenObject(value, options, prefixedKey));
        }
        // Handle primitive values
        else {
            acc[prefixedKey] = value;
        }
        
        return acc;
    }, {});
}
