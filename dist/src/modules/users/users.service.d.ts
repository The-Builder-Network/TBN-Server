import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { PostcodeService } from '../jobs/postcode.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AddServiceDto } from './dto/add-service.dto.js';
import type { AddQualificationDto } from './dto/add-qualification.dto.js';
import type { CreateMessageTemplateDto } from './dto/create-message-template.dto.js';
import type { UpdateMessageTemplateDto } from './dto/update-message-template.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
export declare class UsersService {
    private readonly prisma;
    private readonly uploads;
    private readonly postcode;
    constructor(prisma: PrismaService, uploads: UploadsService, postcode: PostcodeService);
    getPublicProfile(username: string): Promise<{
        username: string;
        name: string;
        companyName: string | null;
        trade: string | null;
        avatarUrl: string | null;
        bio: string | null;
        postcode: string | null;
        memberSince: Date;
        verified: boolean;
        avgRating: number;
        reviewCount: number;
        completedJobs: number;
        badges: string[];
        workRadiusMiles: number;
        services: string[];
        qualifications: {
            name: string;
            verified: boolean;
        }[];
        insurance: {
            publicLiability: string | null;
            employersLiability: string | null;
            professionalIndemnity: string | null;
            verified: boolean;
            expiresAt: Date | null;
        };
        portfolioItems: {
            id: string;
            imageUrl: string;
            title: string | null;
            category: string | null;
        }[];
        ratingBreakdown: Record<string, number>;
        reviews: {
            id: string;
            authorName: string;
            authorAvatar: string | null;
            rating: number;
            comment: string;
            jobTitle: string;
            createdAt: Date;
            reply: {
                body: string;
                createdAt: Date;
            } | undefined;
        }[];
    }>;
    getMyProfile(userId: string): Promise<{
        id: string;
        username: string;
        companyName: string | null;
        bio: string | null;
        trade: string | null;
        postcode: string | null;
        workRadiusMiles: number;
        verificationStatus: import("@prisma/client").$Enums.VerificationStatus;
        guarantee: boolean;
        avgRating: number;
        reviewCount: number;
        completedJobs: number;
        services: {
            id: string;
            serviceSlug: string;
            tradeSlug: string | null;
        }[];
        qualifications: {
            id: string;
            name: string;
            verified: boolean;
            year: number | null;
        }[];
        portfolioItems: {
            id: string;
            imageUrl: string;
            title: string | null;
            category: string | null;
        }[];
        insurance: {
            publicLiability: string | null;
            employersLiability: string | null;
            professionalIndemnity: string | null;
            verified: boolean;
            expiresAt: Date | null;
        };
        messageTemplates: {
            id: string;
            name: string;
            body: string;
        }[];
    }>;
    updateMyProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        username: string;
        companyName: string | null;
        bio: string | null;
        trade: string | null;
        postcode: string | null;
        workRadiusMiles: number;
        verificationStatus: import("@prisma/client").$Enums.VerificationStatus;
        guarantee: boolean;
        avgRating: number;
        reviewCount: number;
        completedJobs: number;
        services: {
            id: string;
            serviceSlug: string;
            tradeSlug: string | null;
        }[];
        qualifications: {
            id: string;
            name: string;
            verified: boolean;
            year: number | null;
        }[];
        portfolioItems: {
            id: string;
            imageUrl: string;
            title: string | null;
            category: string | null;
        }[];
        insurance: {
            publicLiability: string | null;
            employersLiability: string | null;
            professionalIndemnity: string | null;
            verified: boolean;
            expiresAt: Date | null;
        };
        messageTemplates: {
            id: string;
            name: string;
            body: string;
        }[];
    }>;
    updateUser(userId: string, dto: UpdateUserDto): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        name: string;
        phone: string | null;
        avatarUrl: string | null;
        emailVerified: boolean;
    }>;
    uploadAvatar(userId: string, file: Express.Multer.File): Promise<{
        avatarUrl: string;
    }>;
    uploadIdDocument(userId: string, file: Express.Multer.File): Promise<{
        message: string;
    }>;
    addService(userId: string, dto: AddServiceDto): Promise<{
        id: string;
        serviceSlug: string;
        tradeSlug: string | null;
    }>;
    removeService(userId: string, serviceId: string): Promise<void>;
    addQualification(userId: string, dto: AddQualificationDto): Promise<{
        id: string;
        name: string;
        verified: boolean;
        year: number | null;
    }>;
    removeQualification(userId: string, qualId: string): Promise<void>;
    uploadPortfolioItem(userId: string, file: Express.Multer.File, title?: string, category?: string): Promise<{
        id: string;
        imageUrl: string;
        title: string | null;
        category: string | null;
    }>;
    deletePortfolioItem(userId: string, itemId: string): Promise<void>;
    createMessageTemplate(userId: string, dto: CreateMessageTemplateDto): Promise<{
        id: string;
        name: string;
        body: string;
    }>;
    updateMessageTemplate(userId: string, templateId: string, dto: UpdateMessageTemplateDto): Promise<{
        id: string;
        name: string;
        body: string;
    }>;
    deleteMessageTemplate(userId: string, templateId: string): Promise<void>;
    private computeBadges;
}
