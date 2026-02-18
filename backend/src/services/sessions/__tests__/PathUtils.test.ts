import {
  normalizePath,
  generateProjectSlug,
  projectSlugToPath,
} from '../PathUtils';

describe('PathUtils', () => {
  describe('normalizePath', () => {
    it('should return "unknown" for empty or undefined paths', () => {
      expect(normalizePath('')).toBe('unknown');
      expect(normalizePath('unknown')).toBe('unknown');
    });

    it('should normalize Windows paths with backslashes', () => {
      const result = normalizePath('C:\\\\Users\\\\test\\\\project');
      expect(result).toBe('C:\\Users\\test\\project');
    });

    it('should normalize multiple backslashes', () => {
      const result = normalizePath('C:\\\\\\\\Users\\\\test');
      expect(result).toBe('C:\\Users\\test');
    });

    it('should capitalize drive letter on Windows', () => {
      const result = normalizePath('c:\\users\\test');
      expect(result).toBe('C:\\users\\test');
    });

    it('should normalize forward slashes to backslashes for Windows paths', () => {
      const result = normalizePath('C:/Users/test/project');
      expect(result).toBe('C:\\Users\\test\\project');
    });

    it('should handle Unix absolute paths', () => {
      const result = normalizePath('/home/user/project');
      expect(result).toBe('/home/user/project');
    });

    it('should handle relative paths', () => {
      const result = normalizePath('./my-project');
      expect(result).toBe('./my-project');
    });
  });

  describe('generateProjectSlug', () => {
    it('should generate slug from Windows path', () => {
      const result = generateProjectSlug('C:\\Users\\test\\project');
      expect(result).toBe('c--users-test-project');
    });

    it('should generate slug from Unix path', () => {
      const result = generateProjectSlug('/home/user/project');
      expect(result).toBe('-home-user-project');
    });

    it('should convert to lowercase', () => {
      const result = generateProjectSlug('C:\\PROJECTS\\MyApp');
      expect(result).toBe('c--projects-myapp');
    });

    it('should handle paths with forward slashes', () => {
      const result = generateProjectSlug('C:/Users/test/project');
      expect(result).toBe('c--users-test-project');
    });
  });

  describe('projectSlugToPath', () => {
    it('should return "unknown" for empty or undefined slugs', () => {
      expect(projectSlugToPath('')).toBe('unknown');
      expect(projectSlugToPath('unknown')).toBe('unknown');
    });

    it('should convert Windows drive slug to path', () => {
      const result = projectSlugToPath('c-users-test-project');
      expect(result).toBe('C:\\users\\test\\project');
    });

    it('should convert Unix absolute path slug', () => {
      const result = projectSlugToPath('-home-user-project');
      expect(result).toBe('home/user/project');
    });

    it('should handle relative path slug', () => {
      const result = projectSlugToPath('my-project');
      expect(result).toBe('my/project');
    });

    it('should handle slug with capital drive letter', () => {
      const result = projectSlugToPath('C-users-test');
      expect(result).toBe('C:\\users\\test');
    });
  });
});
