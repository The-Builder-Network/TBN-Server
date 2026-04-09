import { Injectable, BadRequestException } from '@nestjs/common';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  placeName: string;
}

interface PostcodesIoResult {
  postcode: string;
  latitude: number;
  longitude: number;
  parish: string | null;
  admin_ward: string | null;
  admin_district: string | null;
}

interface PostcodesIoResponse {
  status: number;
  result: PostcodesIoResult | null;
}

@Injectable()
export class PostcodeService {
  /**
   * Geocodes a UK postcode via postcodes.io.
   * Returns latitude, longitude and a human-readable place name.
   * Throws BadRequestException for invalid postcodes.
   */
  async geocode(postcode: string): Promise<GeocodeResult> {
    const normalised = postcode.trim().toUpperCase().replace(/\s+/g, ' ');
    const encoded = encodeURIComponent(normalised);

    let response: Response;
    try {
      response = await fetch(`https://api.postcodes.io/postcodes/${encoded}`);
    } catch {
      throw new BadRequestException('Could not reach postcode lookup service');
    }

    if (!response.ok) {
      throw new BadRequestException(`Invalid postcode: ${postcode}`);
    }

    const body = (await response.json()) as PostcodesIoResponse;
    const result = body.result;

    if (!result) {
      throw new BadRequestException(`Invalid postcode: ${postcode}`);
    }

    const placeName =
      result.parish ??
      result.admin_ward ??
      result.admin_district ??
      normalised;

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      placeName,
    };
  }
}
