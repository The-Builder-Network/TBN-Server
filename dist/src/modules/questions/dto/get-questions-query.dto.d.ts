export declare class GetQuestionsQueryDto {
    serviceSlug?: string;
    sort?: 'createdAt' | 'answerCount';
    order?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
}
