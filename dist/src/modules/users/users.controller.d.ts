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
    getMyProfile(user: JwtPayload): Promise<{
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
    updateMyProfile(user: JwtPayload, dto: UpdateProfileDto): Promise<{
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
    updateUser(user: JwtPayload, dto: UpdateUserDto): Promise<any>;
    uploadAvatar(user: JwtPayload, file: Express.Multer.File): Promise<{
        avatarUrl: string;
    }>;
    deleteAvatar(user: JwtPayload): Promise<void>;
    uploadIdDocument(user: JwtPayload, file: Express.Multer.File): Promise<{
        message: string;
    }>;
    refreshLeads(user: JwtPayload): Promise<void>;
    addService(user: JwtPayload, dto: AddServiceDto): Promise<{
        id: any;
        serviceSlug: any;
        tradeSlug: any;
    }>;
    removeService(user: JwtPayload, id: string): Promise<void>;
    addQualification(user: JwtPayload, dto: AddQualificationDto): Promise<{
        id: any;
        name: any;
        verified: any;
        year: any;
    }>;
    removeQualification(user: JwtPayload, id: string): Promise<void>;
    uploadPortfolioItem(user: JwtPayload, file: Express.Multer.File, title?: string, category?: string): Promise<{
        id: any;
        imageUrl: any;
        title: any;
        category: any;
    }>;
    deletePortfolioItem(user: JwtPayload, id: string): Promise<void>;
    createMessageTemplate(user: JwtPayload, dto: CreateMessageTemplateDto): Promise<{
        id: any;
        name: any;
        body: any;
    }>;
    updateMessageTemplate(user: JwtPayload, id: string, dto: UpdateMessageTemplateDto): Promise<{
        id: any;
        name: any;
        body: any;
    }>;
    deleteMessageTemplate(user: JwtPayload, id: string): Promise<void>;
    uploadDocument(user: JwtPayload, file: Express.Multer.File): Promise<{
        id: any;
        fileUrl: any;
        fileName: any;
        mimeType: any;
        createdAt: any;
    }>;
    deleteDocument(user: JwtPayload, id: string): Promise<void>;
}
