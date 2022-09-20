import { Document, OptionalUnlessRequiredId, WithoutId } from 'mongodb'
import { TsRawCollection, TsReadWriteCollection } from './collection'
import { DocumentWithId, TsFilter, TsUpdate } from './types'
import { TsModifyResult } from './types/result'

export const middlewareMethods = [
  // Database operations
  'insertOne',
  'insertMany',
  'bulkWrite',
  'updateOne',
  'replaceOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'rename',
  'drop',
  'findOne',
  'find',
  'estimatedDocumentCount',
  'countDocuments',
  'distinct',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'aggregate',
  'watch',
  'mapReduce',
  'initializeUnorderedBulkOp',
  'initializeOrderedBulkOp',
  'insert',
  'update',
  'remove',
  'count',

  // house-keeping operations
  'createIndex',
  'createIndexes',
  'dropIndex',
  'dropIndexes',
  'listIndexes',
  'indexExists',
  'indexInformation',
  'indexes',
  'stats',
] as const

export type MiddlewareMethods = typeof middlewareMethods[number]

type Converter<
  TInsertSchema0 extends Document,
  TInsertSchema1 extends Document,
  TUpdateSchema0 extends Document,
  TUpdateSchema1 extends Document,
  TReplaceSchema0 extends Document,
  TReplaceSchema1 extends Document,
  TsFilterSchema extends DocumentWithId,
  TReturnSchema extends DocumentWithId
> = {
  preInsert: (
    obj: OptionalUnlessRequiredId<TInsertSchema1>
  ) => OptionalUnlessRequiredId<TInsertSchema0>
  preUpdate: (obj: TsUpdate<TUpdateSchema1>) => TsUpdate<TUpdateSchema0>
  preReplace: (obj: WithoutId<TReplaceSchema1>) => WithoutId<TReplaceSchema0>
  postFind: (obj: TReturnSchema) => TReturnSchema
  deleteFilter: (obj: TsFilter<TsFilterSchema>) => TsFilter<TsFilterSchema>
}

export const convertRawCollection = <
  TInsertSchema0 extends Document,
  TInsertSchema1 extends Document,
  TUpdateSchema0 extends Document,
  TUpdateSchema1 extends Document,
  TReplaceSchema0 extends Document,
  TReplaceSchema1 extends Document,
  TsFilterSchema extends DocumentWithId,
  TReturnSchema extends DocumentWithId
>(
  collection: TsRawCollection<
    TInsertSchema0,
    TUpdateSchema0,
    TReplaceSchema0,
    TsFilterSchema,
    TReturnSchema
  >,
  {
    preInsert,
    preUpdate,
    preReplace,
    postFind,
    deleteFilter,
  }: Converter<
    TInsertSchema0,
    TInsertSchema1,
    TUpdateSchema0,
    TUpdateSchema1,
    TReplaceSchema0,
    TReplaceSchema1,
    TsFilterSchema,
    TReturnSchema
  >
): TsRawCollection<
  TInsertSchema1,
  TUpdateSchema1,
  TReplaceSchema1,
  TsFilterSchema,
  TReturnSchema
> => {
  type InputType = TsRawCollection<
    TInsertSchema0,
    TUpdateSchema0,
    TReplaceSchema0,
    TsFilterSchema,
    TReturnSchema
  >

  type ReturnType = TsRawCollection<
    TInsertSchema1,
    TUpdateSchema1,
    TReplaceSchema1,
    TsFilterSchema,
    TReturnSchema
  >

  const convertModifyResult = ({ value, ...result }: TsModifyResult<TReturnSchema>) => ({
    value: value ? postFind(value) : value,
    ...result,
  })

  const convert = <Prop extends MiddlewareMethods>(
    target: InputType,
    prop: Prop,
    converter: (_: InputType[Prop]) => ReturnType[Prop]
  ): ReturnType[Prop] => {
    const oldMethod = target[prop]
    return converter(oldMethod)
  }

  const proxy = new Proxy<InputType>(collection, {
    get: (target, prop) => {
      switch (prop) {
        case 'insertOne': {
          return convert(
            target,
            prop,
            (oldMethod) => (doc, options) => oldMethod(preInsert(doc), options)
          )
        }
        case 'insertMany': {
          return convert(
            target,
            prop,
            (oldMethod) => (docs, options) => oldMethod(docs.map(preInsert), options)
          )
        }
        case 'updateOne': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, update, options) =>
              oldMethod(filter, preUpdate(update), options)
          )
        }
        case 'updateMany': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, update, options) =>
              oldMethod(filter, preUpdate(update), options)
          )
        }
        case 'replaceOne': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, replacement, options) =>
              oldMethod(filter, preReplace(replacement), options)
          )
        }
        case 'findOne': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, options) =>
              oldMethod(filter, options).then((result) => (result ? postFind(result) : null))
          )
        }
        case 'deleteOne': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, options) => oldMethod(deleteFilter(filter), options)
          )
        }
        case 'deleteMany': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, options) => oldMethod(deleteFilter(filter), options)
          )
        }
        case 'find': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, options?) => oldMethod(filter, options).map(postFind)
          )
        }
        case 'findOneAndDelete': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, options) => oldMethod(filter, options).then(convertModifyResult)
          )
        }
        case 'findOneAndReplace': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, replacement, options) =>
              oldMethod(filter, preReplace(replacement), options).then(convertModifyResult)
          )
        }
        case 'findOneAndUpdate': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, update, options) =>
              oldMethod(filter, preUpdate(update), options).then(convertModifyResult)
          )
        }
        case 'insert': {
          return convert(
            target,
            prop,
            (oldMethod) => (docs, options) => oldMethod(docs.map(preInsert), options)
          )
        }
        case 'update': {
          return convert(
            target,
            prop,
            (oldMethod) => (filter, update, options) =>
              oldMethod(filter, preUpdate(update), options)
          )
        }
        default:
          return target[prop as keyof typeof target]
      }
    },
  })

  // HACK: proxy is not meant to change the object type but use it to tweak the type
  return proxy as unknown as ReturnType
}

export const convertReadWriteCollection = <
  TWrite0 extends Document,
  TWrite1 extends Document,
  TRead extends DocumentWithId
>(
  collection: TsReadWriteCollection<TWrite0, TRead>,
  converter: Converter<TWrite0, TWrite1, TWrite0, TWrite1, TWrite0, TWrite1, TRead, TRead>
): TsReadWriteCollection<TWrite1, TRead> =>
  convertRawCollection<TWrite0, TWrite1, TWrite0, TWrite1, TWrite0, TWrite1, TRead, TRead>(
    collection,
    converter
  )
