/* eslint-disable @typescript-eslint/no-explicit-any */

export type Identifier = string | number

export interface RaRecord<IdentifierType extends Identifier = Identifier>
    extends Record<string, any> {
    id: IdentifierType;
}

export interface SortPayload {
    field: string;
    order: 'ASC' | 'DESC';
}
export interface FilterPayload {
    [k: string]: any;
}
export interface PaginationPayload {
    page: number;
    perPage: number;
}
export type ValidUntil = Date
/**
 * i18nProvider types
 */
export type IDataProvider<ResourceType extends string = string> = {
    getList: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: GetListParams
    ) => Promise<GetListResult<RecordType>>;

    getOne: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: GetOneParams<RecordType>
    ) => Promise<GetOneResult<RecordType>>;

    getMany: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: GetManyParams
    ) => Promise<GetManyResult<RecordType>>;

    getManyReference: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: GetManyReferenceParams
    ) => Promise<GetManyReferenceResult<RecordType>>;

    update: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: UpdateParams
    ) => Promise<UpdateResult<RecordType>>;

    updateMany: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: UpdateManyParams
    ) => Promise<UpdateManyResult<RecordType>>;

    create: <
        RecordType extends Omit<RaRecord, 'id'> = any,
        ResultRecordType extends RaRecord = RecordType & { id: Identifier }
    >(
        resource: ResourceType,
        params: CreateParams
    ) => Promise<CreateResult<ResultRecordType>>;

    delete: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: DeleteParams<RecordType>
    ) => Promise<DeleteResult<RecordType>>;

    deleteMany: <RecordType extends RaRecord = any>(
        resource: ResourceType,
        params: DeleteManyParams<RecordType>
    ) => Promise<DeleteManyResult<RecordType>>;

    [key: string]: any;
}

export interface GetListParams {
    pagination: PaginationPayload;
    sort: SortPayload;
    filter: any;
    meta?: any;
}
export interface GetListResult<RecordType extends RaRecord = any> {
    data: RecordType[];
    total?: number;
    pageInfo?: {
        hasNextPage?: boolean;
        hasPreviousPage?: boolean;
    };
}

export interface GetInfiniteListResult<RecordType extends RaRecord = any>
    extends GetListResult<RecordType> {
    pageParam?: number;
}
export interface GetOneParams<RecordType extends RaRecord = any> {
    id: RecordType['id'];
    meta?: any;
}
export interface GetOneResult<RecordType extends RaRecord = any> {
    data: RecordType;
}

export interface GetManyParams {
    ids: Identifier[];
    meta?: any;
}
export interface GetManyResult<RecordType extends RaRecord = any> {
    data: RecordType[];
}

export interface GetManyReferenceParams {
    target: string;
    id: Identifier;
    pagination: PaginationPayload;
    sort: SortPayload;
    filter: any;
    meta?: any;
}
export interface GetManyReferenceResult<RecordType extends RaRecord = any> {
    data: RecordType[];
    total?: number;
    pageInfo?: {
        hasNextPage?: boolean;
        hasPreviousPage?: boolean;
    };
}

export interface UpdateParams<RecordType extends RaRecord = any> {
    id: RecordType['id'];
    data: Partial<RecordType>;
    previousData: RecordType;
    meta?: any;
}
export interface UpdateResult<RecordType extends RaRecord = any> {
    data: RecordType;
}

export interface UpdateManyParams<T = any> {
    ids: Identifier[];
    data: Partial<T>;
    meta?: any;
}
export interface UpdateManyResult<RecordType extends RaRecord = any> {
    data?: RecordType['id'][];
}

export interface CreateParams<T = any> {
    data: Partial<T>;
    meta?: any;
}
export interface CreateResult<RecordType extends RaRecord = any> {
    data: RecordType;
}

export interface DeleteParams<RecordType extends RaRecord = any> {
    id: RecordType['id'];
    previousData?: RecordType;
    meta?: any;
}
export interface DeleteResult<RecordType extends RaRecord = any> {
    data: RecordType;
}

export interface DeleteManyParams<RecordType extends RaRecord = any> {
    ids: RecordType['id'][];
    meta?: any;
}
export interface DeleteManyResult<RecordType extends RaRecord = any> {
    data?: RecordType['id'][];
}

export type DataProviderResult<RecordType extends RaRecord = any> =
    | CreateResult<RecordType>
    | DeleteResult<RecordType>
    | DeleteManyResult
    | GetListResult<RecordType>
    | GetManyResult<RecordType>
    | GetManyReferenceResult<RecordType>
    | GetOneResult<RecordType>
    | UpdateResult<RecordType>
    | UpdateManyResult
