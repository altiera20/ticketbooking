import { sign, verify } from 'jsonwebtoken';
import { User } from '../models/User.model';

type TokenType = 'access' | 'refresh' | 'email-verification' | 'password-reset';

interface TokenPayload {
  userId: string;
  role?: string;
  type: TokenType;
}

export const generateTokens = (user: User) => {
  const accessToken = sign(
    {
      userId: user.id,
      role: user.role,
      type: 'access' as TokenType,
    } as TokenPayload,
    process.env.JWT_ACCESS_SECRET || 'access-secret',
    { expiresIn: '15m' }
  );

  const refreshToken = sign(
    {
      userId: user.id,
      role: user.role,
      type: 'refresh' as TokenType,
    } as TokenPayload,
    process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, type: TokenType): TokenPayload => {
  try {
    let secret: string;
    switch (type) {
      case 'access':
        secret = process.env.JWT_ACCESS_SECRET || 'access-secret';
        break;
      case 'refresh':
        secret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
        break;
      case 'email-verification':
        secret = process.env.JWT_EMAIL_SECRET || 'email-secret';
        break;
      case 'password-reset':
        secret = process.env.JWT_RESET_SECRET || 'reset-secret';
        break;
      default:
        throw new Error('Invalid token type');
    }
    
    const decoded = verify(token, secret) as TokenPayload;
    
    if (decoded.type !== type) {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const generateEmailVerificationToken = (userId: string): string => {
  return sign(
    { userId, type: 'email-verification' as TokenType },
    process.env.JWT_EMAIL_SECRET || 'email-secret',
    { expiresIn: '24h' }
  );
};

export const generatePasswordResetToken = (userId: string): string => {
  return sign(
    { userId, type: 'password-reset' as TokenType },
    process.env.JWT_RESET_SECRET || 'reset-secret',
    { expiresIn: '1h' }
  );
};
