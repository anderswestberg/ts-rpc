/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateParams, DeleteManyParams, DeleteParams, GetListParams, GetListResult, GetManyParams, GetManyReferenceParams, GetManyReferenceResult, GetOneParams, IDataProvider, Identifier, RaRecord, UpdateManyParams, UpdateParams } from "./DataProviderTypes.js"
import { CollectionDefinition } from "./index.js"
import { Collection, MongoClient, Document, ObjectId } from 'mongodb'

const url = 'mongodb://localhost:27017'

export class DataProvider implements IDataProvider {
    dbs: { [resource: string]: Collection<Document> } = {}
    readyFlag = false
    constructor(public collectionDefinition: CollectionDefinition[]) {
        this.init()
    }
    async waitReady() {
        for (; !this.readyFlag;) {
            await new Promise(res => setTimeout(res, 1000))
        }
    }
    async init() {
        const client = new MongoClient(url)
        const dbName = 'myProject'
        await client.connect()
        console.log('Connected successfully to server')
        const db = client.db(dbName)
        for (const resource of this.collectionDefinition) {
            this.dbs[resource.name] = db.collection(resource.name)
        }
        this.readyFlag = true
    }
    async getList<RecordType extends RaRecord = any>(resource: string, params: GetListParams): Promise<GetListResult<RecordType>> {
        const result = await this.getListByField(resource, { id: undefined, target: 'id', ...params })
        return { data: result.data, total: result.total }
    }
    async getListByField<RecordType extends RaRecord = any>(resource: string, params: GetManyReferenceParams): Promise<GetManyReferenceResult<RecordType>> {
        const target = (params.target === 'id') ? '_id' : params.target
        let from = 0
        let to = 0
        if (params?.pagination && params.pagination.page >= 1) {
            from = (params.pagination.page - 1) * params.pagination.perPage
            to = from + params.pagination.perPage
        }
        let sortField
        let sortOrder
        if (params?.sort) {
            sortField = params.sort.field
            sortOrder = params.sort.order
        }
        const filter = params.filter
        let query = filter ? filter : {}
        if (query?.q) {
            let q = query.q.replace(
                /&&/g,
                '&'
            )
            q = q.replace(/\|\|/g, '&')
            const andStrings = (q.split(
                '&'
            ) as string[]).map((s) => s.trim())
            const ands = andStrings.map(
                (value) => ({
                    and: value,
                    ors: [] as string[],
                    regexp: '',
                })
            )
            for (const and of ands) {
                and.ors = and.and
                    .split('|')
                    .map((s) => s.trim())
                and.regexp = and.ors.reduce(
                    (acc, value) => {
                        acc = acc
                            ? acc.concat(
                                '|' + `${value}`
                            )
                            : acc.concat(`${value}`)
                        return acc
                    }
                )
            }
            const expr = ands.reduce(
                (acc, value) =>
                    acc.concat(
                        '(?=.*' + value.regexp + ')'
                    ),
                ''
            )
            {
                // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
                const { q, ...skipQ } = query
                query = { ...skipQ, name: new RegExp(expr, 'i') }
            }
        }
        for (const prop in query) {
            if (prop !== 'q') {
                query[prop] = new RegExp(query[prop], 'i')
            }
        }
        if (params.id) {
            query[target] = new ObjectId(params.id)
        }
        const total = await this.dbs[resource].countDocuments(query)
        let cursor = this.dbs[resource].find(query)
        if (from !== to) {
            cursor = cursor
                .skip(from)
                .limit(to - from)
        }
        if (sortField && sortOrder) {
            cursor = cursor.sort({
                [sortField!]:
                    sortOrder === 'ASC'
                        ? 1
                        : -1,
            })
        }
        const data = this.toReactAdmin(await cursor.toArray())
        const pageInfo = {
            hasNextPage: to < total,
            hasPreviousPage: from > 1
        }
        return { data, total, pageInfo }
    }
    async getOne<RecordType extends RaRecord<Identifier> = any>(resource: string, params: GetOneParams<RecordType>) {
        const cursor = this.dbs[resource].find({ _id: ObjectId.createFromHexString(params.id as string) })
        const data = await cursor.toArray()
        const resultData = (data.length === 1) ? data[0] : null
        return { data: data[0] as unknown as RecordType }
    }
    async getMany<RecordType extends RaRecord<Identifier> = any>(resource: string, params: GetManyParams) {
        const ids = params.ids.map(id => ObjectId.createFromHexString(id as string))
        const cursor = this.dbs[resource].find({ _id: { $in: ids } })
        let data = await cursor.toArray() as unknown as RecordType[]
        data = this.toReactAdmin(data)
        return { data }
    }
    async getManyReference<RecordType extends RaRecord<Identifier> = any>(resource: string, params: GetManyReferenceParams) {
        const result = await this.getListByField(resource, params)
        return result
    }
    async update<RecordType extends RaRecord<Identifier> = any>(resource: string, params: UpdateParams<any>) {
        const updateResult = await this.dbs[resource].updateOne({ _id: ObjectId.createFromHexString(params.id as string) }, params.data)
        let data
        if (updateResult.modifiedCount === 1)
            data = params.data
        return { data: data as RecordType }
    }
    async updateMany<RecordType extends RaRecord<Identifier> = any>(resource: string, params: UpdateManyParams<any>) {
        const sampleId: RecordType['id'] = ''
        const data: RecordType['id'][] = [sampleId]
        return { data }
    }
    async create<RecordType extends Omit<RaRecord<Identifier>, "id"> = any, ResultRecordType extends RaRecord<Identifier> = RecordType & any>(resource: string, params: CreateParams<any>) {
        return { data: {} as ResultRecordType }
    }
    async delete<RecordType extends RaRecord<Identifier> = any>(resource: string, params: DeleteParams<RecordType>) {
        return { data: {} as RecordType }
    }
    async deleteMany<RecordType extends RaRecord<Identifier> = any>(resource: string, params: DeleteManyParams<RecordType>) {
        const sampleId: RecordType['id'] = ''
        const data: RecordType['id'][] = [sampleId]
        return { data }
    }
    toReactAdmin(data: any) {
        if (Array.isArray(data)) {
            for (const obj of data)
                this.toReactAdmin(obj)
        } else if (typeof data === 'object') {
            for (const prop in data) {
                if (data[prop] instanceof ObjectId) {
                    data[prop] = (data[prop] as ObjectId).toHexString()
                    if (prop === '_id') {
                        data.id = data._id
                        delete data._id
                    }
                }
            }
        }
        return data
    }
    toMongoDB(data: any) {
        if (Array.isArray(data)) {
            for (const obj of data)
                this.toMongoDB(obj)
        } else if (typeof data === 'object') {
            for (const prop in data) {
                if (typeof data[prop] === 'string' && data[prop].length === 24 && prop.indexOf('_id') > 0) {
                    data[prop] = new ObjectId(data[prop])
                    if (prop === 'id') {
                        data._id = data.id
                        delete data.id
                    }
                }
            }
        }
        return data
    }
}
