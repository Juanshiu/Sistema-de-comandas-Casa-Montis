'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';
import { Building2, User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingProps {
    onBack: () => void;
}

export default function Onboarding({ onBack }: OnboardingProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        nombreEmpresa: '',
        nombreAdmin: '',
        emailAdmin: '',
        passwordAdmin: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await apiService.registrarEmpresa(formData);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al registrar la empresa');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-secondary-900 mb-2">¡Empresa Registrada!</h2>
                <p className="text-secondary-600 mb-8">
                    Tu sistema SaaS ha sido configurado con éxito. Ahora puedes iniciar sesión con las credenciales que creaste.
                </p>
                <button
                    onClick={onBack}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                    Ir al Inicio de Sesión
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-secondary-800 mb-2 text-center">
                Registro SaaS
            </h2>
            <p className="text-secondary-500 text-sm text-center mb-8">
                Crea una nueva instancia para tu restaurante en segundos
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Nombre de la Empresa</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-5 w-5 text-secondary-400" />
                        <input
                            type="text"
                            required
                            placeholder="Nombre de tu Restaurante"
                            className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={formData.nombreEmpresa}
                            onChange={e => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Nombre Administrador</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-secondary-400" />
                        <input
                            type="text"
                            required
                            placeholder="Tu nombre completo"
                            className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={formData.nombreAdmin}
                            onChange={e => setFormData({ ...formData, nombreAdmin: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Email Administrador</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-secondary-400" />
                        <input
                            type="email"
                            required
                            placeholder="admin@ejemplo.com"
                            className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={formData.emailAdmin}
                            onChange={e => setFormData({ ...formData, emailAdmin: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-secondary-400" />
                        <input
                            type="password"
                            required
                            placeholder="Mínimo 8 caracteres"
                            className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            value={formData.passwordAdmin}
                            onChange={e => setFormData({ ...formData, passwordAdmin: e.target.value })}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all mt-4"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <>
                            <span>Crear mi Empresa</span>
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={onBack}
                    className="w-full text-secondary-500 hover:text-secondary-700 text-sm font-medium mt-2"
                >
                    Ya tengo una empresa, iniciar sesión
                </button>
            </form>
        </div>
    );
}
