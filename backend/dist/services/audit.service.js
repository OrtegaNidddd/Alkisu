import prisma from '../lib/prisma.js';
export const getAuditLogs = async (filters) => {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const whereClause = {};
    if (filters.action)
        whereClause.action = filters.action;
    if (filters.userId)
        whereClause.userId = filters.userId;
    const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.findMany({
            where: whereClause,
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);
    return {
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
        data: logs,
    };
};
