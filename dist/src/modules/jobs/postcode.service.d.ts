export interface GeocodeResult {
    latitude: number;
    longitude: number;
    placeName: string;
}
export declare class PostcodeService {
    geocode(postcode: string): Promise<GeocodeResult>;
}
