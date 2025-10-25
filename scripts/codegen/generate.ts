import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import { format } from 'prettier';

// =============================================================================
// TYPE DEFINITIONS FOR DML SCHEMA
// These interfaces define the expected structure of our YAML-based DML files.
// =============================================================================

interface DmlProperty {
  name: string;
  type: 'uuid' | 'string' | 'email' | 'integer' | 'float' | 'boolean' | 'datetime' | 'text';
  description: string;
  isIdentifier?: boolean;
  isUnique?: boolean;
  isReadonly?: boolean;
  isOptional?: boolean;
}

interface DmlEntity {
  name: string;
  description: string;
  properties: DmlProperty[];
}

interface DmlSchema {
  domain: string;
  service: string;
  entities: DmlEntity[];
}

// =============================================================================
// UTILITY FUNCTIONS
// Helper functions for string manipulation and type mapping.
// =============================================================================

const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

const dmlTypeToTypeScript = (type: DmlProperty['type']): string => {
  const typeMap: Record<DmlProperty['type'], string> = {
    uuid: 'string',
    string: 'string',
    email: 'string',
    integer: 'number',
    float: 'number',
    boolean: 'boolean',
    datetime: 'Date',
    text: 'string',
  };
  return typeMap[type];
};

const dmlTypeToGraphQL = (type: DmlProperty['type']): string => {
  const typeMap: Record<DmlProperty['type'], string> = {
    uuid: 'ID',
    string: 'String',
    email: 'String',
    integer: 'Int',
    float: 'Float',
    boolean: 'Boolean',
    datetime: 'GraphQLISODateTime',
    text: 'String',
  };
  return typeMap[type];
};

const dmlTypeToProto = (type: DmlProperty['type']): string => {
  const typeMap: Record<DmlProperty['type'], string> = {
    uuid: 'string',
    string: 'string',
    email: 'string',
    integer: 'int32',
    float: 'float',
    boolean: 'bool',
    datetime: 'google.protobuf.Timestamp',
    text: 'string',
  };
  return typeMap[type];
};

/**
 * Generates JSDoc comments from DML property descriptions.
 * @param prop The DML property object.
 * @param isForGqlField If true, adds a field description annotation.
 * @returns A string containing the formatted JSDoc comment block.
 */
const generateJsDoc = (prop: DmlProperty, isForGqlField: boolean = false): string => {
  const lines = ['/**'];
  lines.push(` * ${prop.description}`);
  if (isForGqlField) {
    lines.push(` * @description ${prop.description}`);
  }
  lines.push(` * @type {${dmlTypeToTypeScript(prop.type)}${prop.isOptional ? ' | null' : ''}}`);
  lines.push(' */');
  return lines.join('\n  ');
};

// =============================================================================
// CODE GENERATORS
// Each function is responsible for generating code for a specific target.
// =============================================================================

/**
 * Generates a TypeScript class that serves as both a TypeORM entity and a NestJS GraphQL ObjectType.
 * @param entity The parsed DML entity definition.
 * @param schema The full DML schema for context.
 * @returns The generated TypeScript code as a string.
 */
function generateBackendEntity(entity: DmlEntity, schema: DmlSchema): string {
  const className = toPascalCase(entity.name);
  const imports = new Set([
    "import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';",
    "import { ObjectType, Field, ID, Float, Int, GraphQLISODateTime } from '@nestjs/graphql';",
  ]);

  const properties = entity.properties.map(prop => {
    const tsType = dmlTypeToTypeScript(prop.type);
    const gqlType = dmlTypeToGraphQL(prop.type);

    const decorators = [];

    // GraphQL decorators
    let fieldOptions = `{ description: '${prop.description.replace(/'/g, "\\'")}'`;
    if (prop.isOptional) {
      fieldOptions += ', nullable: true';
    }
    fieldOptions += ' }';
    decorators.push(`@Field(() => ${gqlType}, ${fieldOptions})`);

    // TypeORM decorators
    if (prop.isIdentifier) {
      decorators.push("@PrimaryGeneratedColumn('uuid')");
    } else if (prop.type === 'datetime') {
      if (prop.name === 'createdAt') {
        decorators.push("@CreateDateColumn({ type: 'timestamp with time zone' })");
      } else if (prop.name === 'updatedAt') {
        decorators.push("@UpdateDateColumn({ type: 'timestamp with time zone' })");
      } else {
        decorators.push("@Column({ type: 'timestamp with time zone' })");
      }
    } else {
      const columnOptions: string[] = [];
      if(prop.isUnique) columnOptions.push('unique: true');
      if(prop.isOptional) columnOptions.push('nullable: true');
      if(prop.type === 'text') columnOptions.push("type: 'text'");

      decorators.push(`@Column(${columnOptions.length > 0 ? `{ ${columnOptions.join(', ')} }` : ''})`);
    }

    return `
  ${generateJsDoc(prop, true)}
  ${decorators.join('\n  ')}
  ${prop.name}${prop.isOptional ? '?' : ''}: ${tsType};
    `;
  }).join('\n');

  const content = `
// =================================================================================
// THIS FILE IS AUTO-GENERATED by the Code Generation Pipeline.
//
// Do not manually edit this file. Your changes will be overwritten the next time
// the codegen pipeline is run. The source of truth for this file is the DML
// located at: dml/${schema.domain}/${toCamelCase(entity.name)}.dml.yaml
// =================================================================================
${Array.from(imports).join('\n')}

/**
 * ${entity.description}
 *
 * @description This class is auto-generated from a DML definition. It serves as the TypeORM entity
 * for persistence and the GraphQL Object Type for the API layer.
 * @class ${className}
 * @see /dml/${schema.domain}/${toCamelCase(entity.name)}.dml.yaml
 */
@ObjectType({ description: '${entity.description}' })
@Entity({ name: '${toCamelCase(entity.name)}s' }) // Pluralized table name
export class ${className} {
  ${properties}
}
  `;
  return content;
}

/**
 * Generates a Protobuf message definition for an entity.
 * @param entity The parsed DML entity definition.
 * @param schema The full DML schema for context.
 * @returns The generated .proto file content as a string.
 */
function generateProtoDefinition(entity: DmlEntity, schema: DmlSchema): string {
  const messageName = toPascalCase(entity.name);
  const imports = new Set<string>();

  const fields = entity.properties.map((prop, index) => {
    let protoType = dmlTypeToProto(prop.type);
    if (protoType.startsWith('google.protobuf')) {
      imports.add(`import "google/protobuf/timestamp.proto";`);
    }
    if (prop.isOptional) {
      protoType = `optional ${protoType}`;
    }
    return `  // ${prop.description}\n  ${protoType} ${prop.name.replace(/([A-Z])/g, '_$1').toLowerCase()} = ${index + 1};`;
  }).join('\n\n');

  const content = `
// THIS FILE IS AUTO-GENERATED by the Code Generation Pipeline.
// The source of truth for this file is the DML located at: dml/${schema.domain}/${toCamelCase(entity.name)}.dml.yaml

syntax = "proto3";

package ${schema.domain};

${Array.from(imports).join('\n')}

/**
 * @message ${messageName}
 * @description ${entity.description}
 */
message ${messageName} {
${fields}
}
  `;
  return content;
}

/**
 * Generates a TypeScript interface for use in frontend applications.
 * @param entity The parsed DML entity definition.
 * @param schema The full DML schema for context.
 * @returns The generated TypeScript code as a string.
 */
function generateFrontendTypes(entity: DmlEntity, schema: DmlSchema): string {
  const interfaceName = toPascalCase(entity.name);

  const properties = entity.properties.map(prop => {
    const tsType = dmlTypeToTypeScript(prop.type);
    return `
  ${generateJsDoc(prop)}
  readonly ${prop.name}${prop.isOptional ? '?' : ''}: ${tsType};
    `;
  }).join('\n');

  const content = `
// =================================================================================
// THIS FILE IS AUTO-GENERATED by the Code Generation Pipeline.
//
// Do not manually edit this file. Your changes will be overwritten the next time
// the codegen pipeline is run. The source of truth for this file is the DML
// located at: dml/${schema.domain}/${toCamelCase(entity.name)}.dml.yaml
// =================================================================================

/**
 * ${entity.description}
 *
 * @interface ${interfaceName}
 * @description Represents the data structure for a ${entity.name} entity, intended for use in frontend applications.
 * This type is auto-generated from a DML definition to ensure consistency with the backend.
 * @see /dml/${schema.domain}/${toCamelCase(entity.name)}.dml.yaml
 */
export interface ${interfaceName} {
  ${properties}
}
  `;
  return content;
}

// =============================================================================
// MAIN ORCHESTRATION SCRIPT
// =============================================================================

async function main() {
  console.log('🚀 Starting Polyglot Code Generation Pipeline...');

  const dmlFiles = await glob('dml/**/*.dml.yaml');
  if (dmlFiles.length === 0) {
    console.warn('⚠️ No DML files found in `dml/` directory. Nothing to generate.');
    return;
  }

  console.log(`Found ${dmlFiles.length} DML files to process.`);

  for (const file of dmlFiles) {
    console.log(`\nProcessing DML file: ${file}`);
    const content = await fs.readFile(file, 'utf-8');
    const schema = yaml.load(content) as DmlSchema;

    if (!schema.service || !schema.entities) {
      console.error(`❌ Invalid DML format in ${file}. Skipping.`);
      continue;
    }

    for (const entity of schema.entities) {
      const entityName = toCamelCase(entity.name);
      console.log(`  -> Generating artifacts for entity: ${entity.name}`);

      // --- 1. Generate Backend TypeScript Entity ---
      const backendEntityContent = await format(generateBackendEntity(entity, schema), { parser: 'typescript', singleQuote: true });
      const backendEntityPath = `services/${schema.service}/src/domain/entities/${entityName}.entity.ts`;
      await fs.mkdir(path.dirname(backendEntityPath), { recursive: true });
      await fs.writeFile(backendEntityPath, backendEntityContent);
      console.log(`     ✅ Wrote Backend Entity to: ${backendEntityPath}`);
      
      // --- 2. Generate Protobuf Definition ---
      const protoContent = generateProtoDefinition(entity, schema);
      const protoPath = `services/${schema.service}/src/grpc/${entityName}.proto`;
      await fs.mkdir(path.dirname(protoPath), { recursive: true });
      await fs.writeFile(protoPath, protoContent);
      console.log(`     ✅ Wrote Protobuf Definition to: ${protoPath}`);

      // --- 3. Generate Frontend TypeScript Type ---
      const frontendTypeContent = await format(generateFrontendTypes(entity, schema), { parser: 'typescript', singleQuote: true });
      const frontendTypePath = `packages/shared-types/src/${schema.domain}/${entityName}.types.ts`;
      await fs.mkdir(path.dirname(frontendTypePath), { recursive: true });
      await fs.writeFile(frontendTypePath, frontendTypeContent);
      console.log(`     ✅ Wrote Frontend Type to: ${frontendTypePath}`);
    }
  }

  console.log('\n✨ Code generation pipeline completed successfully!');
}

main().catch(error => {
  console.error('❌ An error occurred during code generation:', error);
  process.exit(1);
});
