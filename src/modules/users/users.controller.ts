import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AddServiceDto } from './dto/add-service.dto.js';
import { AddQualificationDto } from './dto/add-qualification.dto.js';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto.js';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── PUBLIC: tradesperson public profile ──────────────────────────────────

  @Get(':username')
  async getPublicProfile(@Param('username') username: string) {
    return this.usersService.getPublicProfile(username);
  }

  // ── TRADESPERSON: own profile ─────────────────────────────────────────────

  @Get('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMyProfile(user.sub);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMyProfile(user.sub, dto);
  }

  // ── HOMEOWNER + TRADESPERSON: update user (name/phone) ───────────────────

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(user.sub, dto);
  }

  // ── AVATAR ────────────────────────────────────────────────────────────────

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png)$/ })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.sub, file);
  }

  // ── ID DOCUMENT ───────────────────────────────────────────────────────────

  @Post('me/id-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async uploadIdDocument(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^(image\/(jpeg|png)|application\/pdf)$/,
        })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadIdDocument(user.sub, file);
  }

  // ── SERVICES ──────────────────────────────────────────────────────────────

  @Post('me/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.CREATED)
  async addService(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AddServiceDto,
  ) {
    return this.usersService.addService(user.sub, dto);
  }

  @Delete('me/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeService(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.removeService(user.sub, id);
  }

  // ── QUALIFICATIONS ────────────────────────────────────────────────────────

  @Post('me/qualifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.CREATED)
  async addQualification(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AddQualificationDto,
  ) {
    return this.usersService.addQualification(user.sub, dto);
  }

  @Delete('me/qualifications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeQualification(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.removeQualification(user.sub, id);
  }

  // ── PORTFOLIO ─────────────────────────────────────────────────────────────

  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadPortfolioItem(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png)$/ })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('category') category?: string,
  ) {
    return this.usersService.uploadPortfolioItem(
      user.sub,
      file,
      title,
      category,
    );
  }

  @Delete('me/portfolio/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePortfolioItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.deletePortfolioItem(user.sub, id);
  }

  // ── MESSAGE TEMPLATES ──────────────────────────────────────────────────────

  @Post('me/message-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.CREATED)
  async createMessageTemplate(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateMessageTemplateDto,
  ) {
    return this.usersService.createMessageTemplate(user.sub, dto);
  }

  @Patch('me/message-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  async updateMessageTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateMessageTemplateDto,
  ) {
    return this.usersService.updateMessageTemplate(user.sub, id, dto);
  }

  @Delete('me/message-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADESPERSON')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessageTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteMessageTemplate(user.sub, id);
  }
}
