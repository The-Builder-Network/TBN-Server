import { UsersService } from './users.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AddServiceDto } from './dto/add-service.dto.js';
import { AddQualificationDto } from './dto/add-qualification.dto.js';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto.js';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    getMyProfile(user: JwtPayload): Promise<{
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
    updateMyProfile(user: JwtPayload, dto: UpdateProfileDto): Promise<{
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
    updateUser(user: JwtPayload, dto: UpdateUserDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        phone: string | null;
        avatarUrl: string | null;
        emailVerified: boolean;
    }>;
    uploadAvatar(user: JwtPayload, file: Express.Multer.File): Promise<{
        avatarUrl: string;
    }>;
    deleteAvatar(user: JwtPayload): Promise<void>;
    uploadIdDocument(user: JwtPayload, file: Express.Multer.File): Promise<{
        message: string;
    }>;
    addService(user: JwtPayload, dto: AddServiceDto): Promise<{
        id: string;
        serviceSlug: string;
        tradeSlug: string | null;
    }>;
    removeService(user: JwtPayload, id: string): Promise<void>;
    addQualification(user: JwtPayload, dto: AddQualificationDto): Promise<{
        id: string;
        name: string;
        verified: boolean;
        year: number | null;
    }>;
    removeQualification(user: JwtPayload, id: string): Promise<void>;
    uploadPortfolioItem(user: JwtPayload, file: Express.Multer.File, title?: string, category?: string): Promise<{
        id: string;
        imageUrl: string;
        title: string | null;
        category: string | null;
    }>;
    deletePortfolioItem(user: JwtPayload, id: string): Promise<void>;
    createMessageTemplate(user: JwtPayload, dto: CreateMessageTemplateDto): Promise<{
        id: string;
        name: string;
        body: string;
    }>;
    updateMessageTemplate(user: JwtPayload, id: string, dto: UpdateMessageTemplateDto): Promise<{
        id: string;
        name: string;
        body: string;
    }>;
    deleteMessageTemplate(user: JwtPayload, id: string): Promise<void>;
}
