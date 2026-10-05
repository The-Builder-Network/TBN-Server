import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { PostcodeService } from '../jobs/postcode.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AddServiceDto } from './dto/add-service.dto.js';
import type { AddQualificationDto } from './dto/add-qualification.dto.js';
import type { CreateMessageTemplateDto } from './dto/create-message-template.dto.js';
import type { UpdateMessageTemplateDto } from './dto/update-message-template.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { JobsService } from '../jobs/jobs.service.js';
export declare class UsersService {
    private readonly prisma;
    private readonly uploads;
    private readonly postcode;
    private readonly jobs;
    constructor(prisma: PrismaService, uploads: UploadsService, postcode: PostcodeService, jobs: JobsService);
    getPublicProfile(username: string): Promise<{
        username: any;
        name: any;
        companyName: any;
        trade: any;
        avatarUrl: any;
        bio: any;
        postcode: any;
        memberSince: any;
        verified: boolean;
        guarantee: any;
        avgRating: any;
        reviewCount: any;
        completedJobs: any;
        badges: string[];
        workRadiusMiles: any;
        services: any;
        qualifications: any;
        insurance: {
            publicLiability: any;
            employersLiability: any;
            professionalIndemnity: any;
            verified: any;
            expiresAt: any;
        };
        portfolioItems: any;
        ratingBreakdown: Record<string, number>;
        reviews: any;
    }>;
    getMyProfile(userId: string): Promise<{
        id: any;
        username: any;
        companyName: any;
        bio: any;
        trade: any;
        postcode: any;
        workRadiusMiles: any;
        verificationStatus: any;
        guarantee: any;
        avgRating: any;
        reviewCount: any;
        completedJobs: any;
        phone: any;
        email: any;
        services: any;
        qualifications: any;
        portfolioItems: any;
        insurance: {
            publicLiability: any;
            employersLiability: any;
            professionalIndemnity: any;
            verified: any;
            expiresAt: any;
        };
        messageTemplates: any;
        documents: any;
    }>;
    updateMyProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: any;
        username: any;
        companyName: any;
        bio: any;
        trade: any;
        postcode: any;
        workRadiusMiles: any;
        verificationStatus: any;
        guarantee: any;
        avgRating: any;
        reviewCount: any;
        completedJobs: any;
        services: any;
        qualifications: any;
        portfolioItems: any;
        insurance: {
            publicLiability: any;
            employersLiability: any;
            professionalIndemnity: any;
            verified: any;
            expiresAt: any;
        };
        messageTemplates: any;
        documents: any;
    }>;
    refreshLeads(userId: string): Promise<void>;
    updateUser(userId: string, dto: UpdateUserDto): Promise<any>;
    uploadAvatar(userId: string, file: Express.Multer.File): Promise<{
        avatarUrl: string;
    }>;
    deleteAvatar(userId: string): Promise<void>;
    uploadIdDocument(userId: string, file: Express.Multer.File): Promise<{
        message: string;
    }>;
    addService(userId: string, dto: AddServiceDto): Promise<{
        id: any;
        serviceSlug: any;
        tradeSlug: any;
    }>;
    removeService(userId: string, serviceId: string): Promise<void>;
    addQualification(userId: string, dto: AddQualificationDto): Promise<{
        id: any;
        name: any;
        verified: any;
        year: any;
    }>;
    removeQualification(userId: string, qualId: string): Promise<void>;
    uploadPortfolioItem(userId: string, file: Express.Multer.File, title?: string, category?: string): Promise<{
        id: any;
        imageUrl: any;
        title: any;
        category: any;
    }>;
    deletePortfolioItem(userId: string, itemId: string): Promise<void>;
    createMessageTemplate(userId: string, dto: CreateMessageTemplateDto): Promise<{
        id: any;
        name: any;
        body: any;
    }>;
    updateMessageTemplate(userId: string, templateId: string, dto: UpdateMessageTemplateDto): Promise<{
        id: any;
        name: any;
        body: any;
    }>;
    deleteMessageTemplate(userId: string, templateId: string): Promise<void>;
    private computeBadges;
    uploadDocument(userId: string, file: Express.Multer.File): Promise<{
        id: any;
        fileUrl: any;
        fileName: any;
        mimeType: any;
        createdAt: any;
    }>;
    deleteDocument(userId: string, docId: string): Promise<void>;
}
