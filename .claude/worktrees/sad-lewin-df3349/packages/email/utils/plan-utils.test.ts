import { describe, it, expect } from 'vitest';
import { 
  normalizePlanName, 
  getPlanConfig, 
  getPlanBenefits, 
  isFreePlan, 
  isProPlan, 
  isMaxPlan 
} from './plan-utils';
import { PLAN_TYPES } from '../types/plan-types';

describe('Plan Utils', () => {
  describe('normalizePlanName', () => {
    it('should normalize free plan names', () => {
      expect(normalizePlanName('zhop free')).toBe(PLAN_TYPES.FREE);
      expect(normalizePlanName('Zhop Free')).toBe(PLAN_TYPES.FREE);
      expect(normalizePlanName('ZHOP FREE')).toBe(PLAN_TYPES.FREE);
      expect(normalizePlanName('free')).toBe(PLAN_TYPES.FREE);
      expect(normalizePlanName('Free Plan')).toBe(PLAN_TYPES.FREE);
    });

    it('should normalize pro plan names', () => {
      expect(normalizePlanName('zhop pro')).toBe(PLAN_TYPES.PRO);
      expect(normalizePlanName('Zhop Pro')).toBe(PLAN_TYPES.PRO);
      expect(normalizePlanName('ZHOP PRO')).toBe(PLAN_TYPES.PRO);
      expect(normalizePlanName('pro')).toBe(PLAN_TYPES.PRO);
      expect(normalizePlanName('Pro Plan')).toBe(PLAN_TYPES.PRO);
    });

    it('should normalize max plan names', () => {
      expect(normalizePlanName('zhop max')).toBe(PLAN_TYPES.MAX);
      expect(normalizePlanName('Zhop Max')).toBe(PLAN_TYPES.MAX);
      expect(normalizePlanName('ZHOP MAX')).toBe(PLAN_TYPES.MAX);
      expect(normalizePlanName('max')).toBe(PLAN_TYPES.MAX);
      expect(normalizePlanName('Max Plan')).toBe(PLAN_TYPES.MAX);
    });

    it('should default to free plan for unknown names', () => {
      expect(normalizePlanName('unknown')).toBe(PLAN_TYPES.FREE);
      expect(normalizePlanName('')).toBe(PLAN_TYPES.FREE);
    });
  });

  describe('getPlanConfig', () => {
    it('should return the correct plan configuration', () => {
      const freeConfig = getPlanConfig('zhop free');
      const proConfig = getPlanConfig('zhop pro');
      const maxConfig = getPlanConfig('zhop max');

      expect(freeConfig.pricing.monthly).toBe(0);
      expect(proConfig.pricing.monthly).toBe(20);
      expect(maxConfig.pricing.monthly).toBe(40);
    });
  });

  describe('getPlanBenefits', () => {
    it('should return the correct plan benefits', () => {
      const freeBenefits = getPlanBenefits('zhop free');
      const proBenefits = getPlanBenefits('zhop pro');
      const maxBenefits = getPlanBenefits('zhop max');

      expect(freeBenefits.features).toContain('Up to 1 project');
      expect(proBenefits.features).toContain('Up to 3 projects');
      expect(maxBenefits.features).toContain('Up to 6 projects');
    });
  });

  describe('plan type checks', () => {
    it('should correctly identify free plans', () => {
      expect(isFreePlan('zhop free')).toBe(true);
      expect(isFreePlan('Zhop Free')).toBe(true);
      expect(isFreePlan('zhop pro')).toBe(false);
      expect(isFreePlan('zhop max')).toBe(false);
    });

    it('should correctly identify pro plans', () => {
      expect(isProPlan('zhop pro')).toBe(true);
      expect(isProPlan('Zhop Pro')).toBe(true);
      expect(isProPlan('zhop free')).toBe(false);
      expect(isProPlan('zhop max')).toBe(false);
    });

    it('should correctly identify max plans', () => {
      expect(isMaxPlan('zhop max')).toBe(true);
      expect(isMaxPlan('Zhop Max')).toBe(true);
      expect(isMaxPlan('zhop free')).toBe(false);
      expect(isMaxPlan('zhop pro')).toBe(false);
    });
  });
});
