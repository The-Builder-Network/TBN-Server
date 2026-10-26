import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { normalisePostcode } from './geo.js';

export interface GeocodeResult {
  postcode: string;
  district: string;
  latitude: number;
  longitude: number;
  placeName: string;
}

interface PostcodesIoResult {
  postcode: string;
  outcode: string;
  latitude: number;
  longitude: number;
  parish: string | null;
  admin_ward: string | null;
  admin_district: string | null;
}

@Injectable()
export class PostcodeService {
  private readonly logger = new Logger(PostcodeService.name);

  /**
   * Geocodes a UK postcode via postcodes.io (5s timeout).
   * Throws 400 for unknown postcodes and 503 if the lookup service is down.
   */
  async geocode(postcode: string): Promise<GeocodeResult> {
    const normalised = normalisePostcode(postcode);
    let response: Response;
    try {
      response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(normalised)}`,
        { signal: AbortSignal.timeout(5000) },
      );
    } catch (err) {
      this.logger.warn(`postcodes.io unreachable: ${(err as Error).message}`);
      throw new BadRequestException(
        'We could not check that postcode right now. Please try again.',
      );
    }

    if (!response.ok) {
      throw new BadRequestException(`"${postcode}" is not a valid UK postcode`);
    }

    const body = (await response.json()) as {
      result: PostcodesIoResult | null;
    };
    const r = body.result;
    if (!r)
      throw new BadRequestException(`"${postcode}" is not a valid UK postcode`);

    return {
      postcode: r.postcode,
      district: r.outcode,
      latitude: r.latitude,
      longitude: r.longitude,
      placeName: r.admin_ward ?? r.parish ?? r.admin_district ?? r.postcode,
    };
  }
}
