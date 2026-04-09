export declare class GetQuestionsQueryDto {
    serviceSlug?: string;
    authorId?: string;
    sort?: 'createdAt' | 'answerCount';
    order?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
}
