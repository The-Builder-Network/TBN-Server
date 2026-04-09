export declare class CreateJobDto {
    title: string;
    description: string;
    serviceSlug: string;
    tradeSlug?: string;
    postcode: string;
    answersJson?: Record<string, unknown>;
}
