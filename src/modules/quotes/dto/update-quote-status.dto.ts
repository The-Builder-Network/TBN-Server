import { IsIn } from 'class-validator';

export class UpdateQuoteStatusDto {
  @IsIn(['ACCEPTED', 'DECLINED', 'WITHDRAWN'])
  status!: 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
}
