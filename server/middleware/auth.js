import jwt from 'jsonwebtoken';

/**
 * requireAuth — verifies Bearer JWT.
 * Attaches decoded payload to req.user.
 */
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, name, email, role, department_id }
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

/**
 * requireRole — factory that returns middleware for allowed roles.
 * Usage: requireRole('admin'), requireRole('admin', 'officer')
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Required: ${roles.join(' or ')}` });
        }
        next();
    };
}
