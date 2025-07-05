import { Category } from '@prisma/client';
import { CATEGORY_CONFIG } from '../config/constants.js';

export interface FlatCategory extends Omit<Category, 'children'> {
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
}

export function flattenCategoryTree(categories: Category[], maxDepth = CATEGORY_CONFIG.MAX_QUERY_DEPTH): FlatCategory[] {
  const flattened: FlatCategory[] = [];
  
  function traverse(cats: Category[], depth = 0) {
    if (depth > maxDepth) return;
    
    for (const category of cats) {
      const { children, ...categoryWithoutChildren } = category;
      
      flattened.push({
        ...categoryWithoutChildren,
        depth,
        hasChildren: children.length > 0,
        childrenCount: children.length
      });
      
      if (children.length > 0 && depth < maxDepth) {
        traverse(children, depth + 1);
      }
    }
  }
  
  traverse(categories);
  return flattened;
}

export function getCategoryPath(category: Category, allCategories: Category[]): string[] {
  const path: string[] = [];
  
  function findPath(cat: Category) {
    path.unshift(cat.name);
    
    if (cat.parentId) {
      const parent = allCategories.find(c => c.id === cat.parentId);
      if (parent) {
        findPath(parent);
      }
    }
  }
  
  findPath(category);
  return path;
}

export function sanitizeCategoryForJSON(category: Category, maxDepth = 2): any {
  function sanitize(cat: Category, depth = 0): any {
    const { children, ...rest } = cat;
    
    return {
      ...rest,
      children: depth < maxDepth ? children.map(child => sanitize(child, depth + 1)) : []
    };
  }
  
  return sanitize(category);
}