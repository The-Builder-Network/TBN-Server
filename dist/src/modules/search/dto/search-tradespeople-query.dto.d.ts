export declare class SearchTradespeopleQueryDto {
    query?: string;
    serviceSlug?: string;
    postcode?: string;
    radiusMiles?: number;
    guarantee?: boolean;
    page?: number;
    perPage?: number;
    sort?: 'rating' | 'reviewCount' | 'completedJobs';
    order?: 'asc' | 'desc';
}
