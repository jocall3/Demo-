/**
 * @file packages/ui-library/src/components/FormEngine.tsx
 * @description Implements a generic, schema-driven form and wizard rendering engine.
 *
 * @architectural_directive Implement a Schema-Driven UI Rendering Engine for Dynamic Form and Wizard Generation
 * This component is the centerpiece of the schema-driven UI architecture. It fetches a declarative JSON schema
 * that defines a form's structure, fields, validation, and conditional logic. It then dynamically renders the
 * entire form or multi-step wizard, manages its state, and handles validation and submission.
 *
 * Core Responsibilities:
 * 1.  Fetches a form schema from a given URL (`schemaUrl`).
 * 2.  Manages the form's entire state, including field values, validation errors, and touched status, using a `useReducer` hook.
 * 3.  Dynamically renders form fields (inputs, selects, textareas, etc.) based on the schema definition.
 * 4.  Evaluates conditional logic in real-time to show or hide fields/steps based on user input.
 * 5.  Performs validation on blur and on submission based on rules defined in the schema.
 * 6.  Supports multi-step (wizard) forms with step-by-step navigation and validation.
 * 7.  Handles form submission by calling an `onSubmit` callback with the validated data.
 * 8.  Provides clear loading and error states for schema fetching.
 */

import React, { useState, useEffect, useCallback, useReducer, FC } from 'react';

// ===================================================================================
// TYPE DEFINITIONS: THE FORM SCHEMA CONTRACT
// ===================================================================================

/** @description Defines a validation rule for a form field. */
export type ValidationRule = 
  | { type: 'required'; message: string }
  | { type: 'minLength'; value: number; message: string }
  | { type: 'maxLength'; value: number; message: string }
  | { type: 'pattern'; value: string; message: string }
  | { type: 'isEmail'; message: string };

/** @description Defines a conditional logic rule for displaying a field or step. */
export interface Condition {
  /** The name of the field to check. */
  field: string;
  /** The comparison operator. */
  operator: 'equals' | 'notEquals' | 'contains' | 'isTruthy' | 'isFalsy';
  /** The value to compare against. Not required for 'isTruthy' or 'isFalsy'. */
  value?: any;
}

/** @description Defines a single option for a `select` or `radio` field. */
export interface FieldOption {
  label: string;
  value: string | number;
}

/** @description Defines the schema for a single form field. */
export interface FormFieldDef {
  /** A unique name for the field, used as the key in the form data object. */
  name: string;
  /** The user-visible label for the field. */
  label: string;
  /** The type of input to render. */
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  /** A placeholder text for the input field. */
  placeholder?: string;
  /** The default value for the field. */
  defaultValue?: any;
  /** An array of options, required for `select` and `radio` types. */
  options?: FieldOption[];
  /** An array of validation rules to apply to the field. */
  validation?: ValidationRule[];
  /** An array of conditions that must all be met for this field to be visible. */
  conditions?: Condition[];
}

/** @description Defines the schema for a single step in a multi-step wizard. */
export interface FormStepDef {
  /** A unique identifier for the step. */
  id: string;
  /** The title of the step, displayed to the user. */
  title: string;
  /** An array of form fields included in this step. */
  fields: FormFieldDef[];
   /** An array of conditions that must all be met for this step to be visible. */
  conditions?: Condition[];
}

/** @description The root schema definition for a form or wizard. */
export interface FormSchemaDef {
  /** The unique identifier for the form schema. */
  id: string;
  /** The name of the form, used for display purposes. */
  name: string;
  /** Defines the layout of the form. 'single-page' or 'wizard'. */
  layout: 'single-page' | 'wizard';
  /** An array of fields (for 'single-page') or steps (for 'wizard'). */
  content: FormFieldDef[] | FormStepDef[];
}

// ===================================================================================
// STATE MANAGEMENT: useReducer for Form State
// ===================================================================================

interface FormState {
  values: Record<string, any>;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  currentStep: number;
}

type FormAction =
  | { type: 'SET_FIELD_VALUE'; payload: { field: string; value: any } }
  | { type: 'SET_FIELD_TOUCHED'; payload: { field: string } }
  | { type: 'SET_ERRORS'; payload: Record<string, string | null> }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET'; payload: FormState };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD_VALUE':
      return { ...state, values: { ...state.values, [action.payload.field]: action.payload.value } };
    case 'SET_FIELD_TOUCHED':
      return { ...state, touched: { ...state.touched, [action.payload.field]: true } };
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return { ...state, currentStep: state.currentStep - 1 };
    case 'RESET':
      return action.payload;
    default:
      return state;
  }
};

// ===================================================================================
// HELPER LOGIC: Validation and Conditional Rendering
// ===================================================================================

const evaluateCondition = (condition: Condition, values: Record<string, any>): boolean => {
  const fieldValue = values[condition.field];
  switch (condition.operator) {
    case 'equals': return fieldValue === condition.value;
    case 'notEquals': return fieldValue !== condition.value;
    case 'contains': return Array.isArray(fieldValue) && fieldValue.includes(condition.value);
    case 'isTruthy': return !!fieldValue;
    case 'isFalsy': return !fieldValue;
    default: return true;
  }
};

const validateField = (fieldDef: FormFieldDef, value: any): string | null => {
  if (!fieldDef.validation) return null;

  for (const rule of fieldDef.validation) {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) return rule.message;
        break;
      case 'minLength':
        if (typeof value === 'string' && value.length < rule.value) return rule.message;
        break;
      case 'isEmail':
        if (typeof value === 'string' && !/\S+@\S+\.\S+/.test(value)) return rule.message;
        break;
      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) return rule.message;
        break;
    }
  }
  return null;
};

// ===================================================================================
// DATA FETCHING HOOK: useFormSchema
// ===================================================================================

const useFormSchema = (schemaUrl: string) => {
  const [schema, setSchema] = useState<FormSchemaDef | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchema = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // In a real app, this URL would point to the new 'UI Schema Service'.
        const response = await fetch(schemaUrl);
        if (!response.ok) throw new Error(`Failed to fetch schema: ${response.statusText}`);
        const data = await response.json();
        setSchema(data);
      } catch (e: any) {
        setError(e.message || 'An unknown error occurred while fetching the form schema.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchema();
  }, [schemaUrl]);

  return { schema, isLoading, error };
};

// ===================================================================================
// FIELD RENDERER COMPONENT
// ===================================================================================

interface FormFieldProps {
  field: FormFieldDef;
  value: any;
  error: string | null;
  touched: boolean;
  onChange: (value: any) => void;
  onBlur: () => void;
}

const FormField: FC<FormFieldProps> = ({ field, value, error, touched, onChange, onBlur }) => {
  const showError = error && touched;
  const baseInputClasses = 'w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 transition-colors';
  const errorInputClasses = 'border-red-500/50 focus:ring-red-500';
  const normalInputClasses = 'focus:ring-cyan-500 focus:border-cyan-500';

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={field.placeholder} className={`${baseInputClasses} ${showError ? errorInputClasses : normalInputClasses} min-h-[100px]`} />;
      case 'select':
        return <select value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={`${baseInputClasses} ${showError ? errorInputClasses : normalInputClasses}`}>{field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>;
      case 'checkbox':
        return <div className="flex items-center"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} onBlur={onBlur} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500" /><label className="ml-2 text-gray-300">{field.label}</label></div>
      default:
        return <input type={field.type} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={field.placeholder} className={`${baseInputClasses} ${showError ? errorInputClasses : normalInputClasses}`} />;
    }
  }
  return (
    <div className="mb-4">
      {field.type !== 'checkbox' && <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>}
      {renderInput()}
      {showError && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

// ===================================================================================
// MAIN FORM ENGINE COMPONENT
// ===================================================================================

export interface FormEngineProps {
  /** The URL to fetch the form schema from. */
  schemaUrl: string;
  /** A callback function executed on successful form submission with the validated data. */
  onSubmit: (data: Record<string, any>) => Promise<void>;
  /** An optional callback for a cancel action. */
  onCancel?: () => void;
}

const FormEngine: FC<FormEngineProps> = ({ schemaUrl, onSubmit, onCancel }) => {
  const { schema, isLoading: isSchemaLoading, error: schemaError } = useFormSchema(schemaUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getInitialState = useCallback((): FormState => {
    if (!schema) return { values: {}, errors: {}, touched: {}, currentStep: 0 };
    const initialValues: Record<string, any> = {};
    const allFields = schema.layout === 'wizard' 
      ? (schema.content as FormStepDef[]).flatMap(step => step.fields)
      : (schema.content as FormFieldDef[]);
    allFields.forEach(field => { initialValues[field.name] = field.defaultValue === undefined ? '' : field.defaultValue; });
    return { values: initialValues, errors: {}, touched: {}, currentStep: 0 };
  }, [schema]);

  const [state, dispatch] = useReducer(formReducer, getInitialState());

  useEffect(() => {
    dispatch({ type: 'RESET', payload: getInitialState() });
  }, [schema, getInitialState]);

  const visibleSteps = useMemo(() => {
    if (!schema || schema.layout !== 'wizard') return [];
    return (schema.content as FormStepDef[]).filter(step => !step.conditions || step.conditions.every(c => evaluateCondition(c, state.values)));
  }, [schema, state.values]);

  const currentStepDef = schema && schema.layout === 'wizard' ? visibleSteps[state.currentStep] : null;
  const allFields = schema && schema.layout === 'single-page' ? (schema.content as FormFieldDef[]) : [];
  
  const handleFieldChange = (field: string, value: any) => {
    dispatch({ type: 'SET_FIELD_VALUE', payload: { field, value } });
  };

  const handleFieldBlur = (fieldDef: FormFieldDef) => {
    dispatch({ type: 'SET_FIELD_TOUCHED', payload: { field: fieldDef.name } });
    const error = validateField(fieldDef, state.values[fieldDef.name]);
    dispatch({ type: 'SET_ERRORS', payload: { ...state.errors, [fieldDef.name]: error } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const fieldsToValidate = schema?.layout === 'wizard' ? currentStepDef?.fields || [] : allFields;
    const visibleFields = fieldsToValidate.filter(f => !f.conditions || f.conditions.every(c => evaluateCondition(c, state.values)));

    const newErrors: Record<string, string | null> = {};
    let hasError = false;
    visibleFields.forEach(field => {
      const error = validateField(field, state.values[field.name]);
      newErrors[field.name] = error;
      if (error) hasError = true;
    });
    
    dispatch({ type: 'SET_ERRORS', payload: newErrors });

    if (!hasError) {
      if (schema?.layout === 'wizard' && state.currentStep < visibleSteps.length - 1) {
        dispatch({ type: 'NEXT_STEP' });
      } else {
        await onSubmit(state.values);
      }
    }
    setIsSubmitting(false);
  };

  if (isSchemaLoading) return <div>Loading Form...</div>;
  if (schemaError) return <div className="text-red-400">Error: {schemaError}</div>;
  if (!schema) return null;

  const fieldsToRender = currentStepDef ? currentStepDef.fields : allFields;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-2">{schema.name}</h2>
      {currentStepDef && <p className="text-sm text-cyan-400 mb-6">Step {state.currentStep + 1} of {visibleSteps.length}: {currentStepDef.title}</p>}

      {fieldsToRender.filter(field => !field.conditions || field.conditions.every(c => evaluateCondition(c, state.values))).map(field => (
        <FormField 
          key={field.name} 
          field={field} 
          value={state.values[field.name]}
          error={state.errors[field.name]}
          touched={state.touched[field.name]}
          onChange={(value) => handleFieldChange(field.name, value)}
          onBlur={() => handleFieldBlur(field)}
        />
      ))}

      <div className="flex justify-between items-center mt-6">
        <div>
          {schema.layout === 'wizard' && state.currentStep > 0 && (
            <button type="button" onClick={() => dispatch({ type: 'PREV_STEP' })} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">
              Previous
            </button>
          )}
          {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg ml-2">Cancel</button>}
        </div>
        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Submitting...' : (schema.layout === 'wizard' && state.currentStep < visibleSteps.length - 1 ? 'Next' : 'Submit')}
        </button>
      </div>
    </form>
  );
};

export default FormEngine;
