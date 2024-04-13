/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionDefinition } from "./index.js"
import Datastore from '@seald-io/nedb'

export interface GetListParams {
    pagination: { page: number, perPage: number };
    sort: { field: string, order: 'ASC' | 'DESC' };
    filter: any;
    meta?: any;
}

export interface GetListResult {
    data: any[];
    total?: number;
    // if using partial pagination
    pageInfo?: {
        hasNextPage?: boolean;
        hasPreviousPage?: boolean;
    };
}

export class DataProvider {
    dbs: { [resource: string]: Datastore } = {}
    constructor(public collectionDefinition: CollectionDefinition[]) {
        for (const resource of collectionDefinition) {
            this.dbs[resource.name] = new Datastore({ filename: `${resource.name}-store.json`, autoload: true })
        }
        this.init()
    }
    async init() {
        for (const resource of this.collectionDefinition) {
            await this.dbs[resource.name].findAsync({})
        }
    }
    async getList(resource: string, params: GetListParams) {
        let from = 0
        let to = 10
        if (params?.pagination) {
            from = (params.pagination.page - 1) * params.pagination.perPage
            to = from + params.pagination.perPage - 1
        }
        const sort: string[] = []
        let sortField
        let sortOrder
        if (params?.pagination) {
            sortField = params.sort.field
            sortOrder = params.sort.order
        }
        const filter = params.filter
        let query = filter as any
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
        const total = await this.dbs[resource].countAsync(query)
        let cursor = this.dbs[resource].find(query)
        cursor = cursor
            .skip(from)
            .limit(to - from)
        if (sort) {
            cursor = cursor.sort({
                [sortField!]:
                    sortOrder === 'ASC'
                        ? 1
                        : -1,
            })
        }
        const data = await cursor
        return { data, total }
    }
    toId(data: any) {
        if (Array.isArray(data)) {
            for (const obj of data)
                this.toId(obj)
        } else if (typeof data === 'object') {
            if (data._id !== undefined) {
                data.id = data._id
                delete data._id
            }
        }
        return data
    }
    to_Id(data: any) {
        if (Array.isArray(data)) {
            for (const obj of data)
                this.to_Id(obj)
        } else if (typeof data === 'object') {
            if (data.id !== undefined) {
                data._id = data.id
                delete data.id
            }
        }
        return data
    }
}
