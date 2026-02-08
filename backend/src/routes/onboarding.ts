import { Router, Request, Response } from 'express';
import { OnboardingService } from '../services/onboardingService';

const router = Router();
const onboardingService = new OnboardingService();

// POST /api/onboarding/empresa
router.post('/empresa', async (req: Request, res: Response) => {
    try {
        const { nombreEmpresa, nombreAdmin, emailAdmin, passwordAdmin } = req.body;

        if (!nombreEmpresa || !nombreAdmin || !emailAdmin || !passwordAdmin) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const result = await onboardingService.createTenant({
            nombreEmpresa,
            nombreAdmin,
            emailAdmin,
            passwordAdmin
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error in onboarding:', error);
        res.status(500).json({ error: error.message || 'Error al crear la empresa' });
    }
});

export default router;
