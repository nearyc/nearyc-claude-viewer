import {
  normalizePath,
  generateProjectSlug,
  projectSlugToPath,
  isPathAllowed,
  isValidSessionId
} from '../pathUtils';

describe('pathUtils', () => {
  describe('normalizePath', () => {
    it('should normalize forward slashes', () => {
      const result = normalizePath('C:\\\\Users\\\\test\\\\project');
      expect(result).toBe('C:/Users/test/project');
    });

    it('should capitalize drive letter on Windows', () => {
      const result = normalizePath('c:/users/test');
      expect(result).toBe('C:/users/test');
    });

    it('should handle already normalized paths', () => {
      const result = normalizePath('C:/Users/test');
      expect(result).toBe('C:/Users/test');
    });
  });

  describe('generateProjectSlug', () => {
    it('should generate slug from Windows path', () => {
      const result = generateProjectSlug('C:\\\\Users\\\\test\\\\project');
      expect(result).toBe('c-users-test-project');
    });

    it('should generate slug from Unix path', () => {
      const result = generateProjectSlug('/home/user/project');
      expect(result).toBe('-home-user-project');
    });

    it('should convert to lowercase', () => {
      const result = generateProjectSlug('C:\\\\PROJECTS\\\\MyApp');
      expect(result).toBe('c-projects-myapp');
    });
  });

  describe('projectSlugToPath', () => {
    it('should handle slug without drive letter', () => {
      const result = projectSlugToPath('-home-user-project');
      expect(result).toBe('/home/user/project');
    });
  });

  describe('isPathAllowed', () => {
    it('should return true for allowed path', () => {
      const allowedRoots = ['/home/user/projects', '/workspace'];
      const result = isPathAllowed('/home/user/projects/myapp', allowedRoots);
      expect(result).toBe(true);
    });

    it('should return false for disallowed path', () => {
      const allowedRoots = ['/home/user/projects'];
      const result = isPathAllowed('/etc/passwd', allowedRoots);
      expect(result).toBe(false);
    });

    it('should handle exact root match', () => {
      const allowedRoots = ['/home/user/projects'];
      const result = isPathAllowed('/home/user/projects', allowedRoots);
      expect(result).toBe(true);
    });
  });

  describe('isValidSessionId', () => {
    it('should return true for valid session ID', () => {
      expect(isValidSessionId('abc-123-xyz')).toBe(true);
      expect(isValidSessionId('session123')).toBe(true);
      expect(isValidSessionId('ABC-XYZ')).toBe(true);
    });

    it('should return false for invalid session ID', () => {
      expect(isValidSessionId('abc_123')).toBe(false);
      expect(isValidSessionId('abc 123')).toBe(false);
      expect(isValidSessionId('abc@123')).toBe(false);
      expect(isValidSessionId('')).toBe(false);
    });

    it('should return false for overly long session ID', () => {
      expect(isValidSessionId('a'.repeat(65))).toBe(false);
    });
  });
});
