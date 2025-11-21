"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Plus, Calendar, Home, User, Bell, Check, X, ChevronRight, Info, Clock, Phone, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";

type Pet = Database['public']['Tables']['pets']['Row'];
type Vaccine = Database['public']['Tables']['vaccines']['Row'];

interface PetWithVaccines extends Pet {
  vaccines: Vaccine[];
}

interface PetService {
  id: string;
  name: string;
  type: "petshop" | "clinic";
  address: string;
  phone: string;
  hours: string;
  distance: string;
}

interface TrainingGuide {
  id: string;
  title: string;
  description: string;
  difficulty: "Fácil" | "Médio" | "Avançado";
  duration: string;
}

export default function GuiaPetApp() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [pets, setPets] = useState<PetWithVaccines[]>([]);
  const [selectedPet, setSelectedPet] = useState<PetWithVaccines | null>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [activeTab, setActiveTab] = useState("meu-pet");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Form states
  const [petForm, setPetForm] = useState({
    name: "",
    breed: "",
    age: "",
    weight: "",
    photo_url: ""
  });

  // Check authentication and load user data
  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
        loadPets(session?.user?.id);
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      await loadPets(user.id);
      
      // Check if user has completed onboarding
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id);

      if (!petsData || petsData.length === 0) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadPets = async (userId?: string) => {
    if (!userId) return;

    try {
      // Load pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (petsError) throw petsError;

      if (petsData && petsData.length > 0) {
        // Load vaccines for each pet
        const petsWithVaccines = await Promise.all(
          petsData.map(async (pet) => {
            const { data: vaccinesData } = await supabase
              .from('vaccines')
              .select('*')
              .eq('pet_id', pet.id)
              .order('next_date', { ascending: true });

            return {
              ...pet,
              vaccines: vaccinesData || []
            };
          })
        );

        setPets(petsWithVaccines);
        setSelectedPet(petsWithVaccines[0]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const handleAddPet = async () => {
    if (!petForm.name || !petForm.breed || !user) return;

    try {
      // Insert pet
      const { data: newPet, error: petError } = await supabase
        .from('pets')
        .insert({
          user_id: user.id,
          name: petForm.name,
          breed: petForm.breed,
          age: petForm.age,
          weight: petForm.weight,
          photo_url: petForm.photo_url,
          health_status: 'Saudável'
        })
        .select()
        .single();

      if (petError) throw petError;

      // Add default vaccines
      const defaultVaccines = [
        {
          pet_id: newPet.id,
          name: 'V10',
          date: new Date().toISOString().split('T')[0],
          next_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          pet_id: newPet.id,
          name: 'Antirrábica',
          date: new Date().toISOString().split('T')[0],
          next_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ];

      const { error: vaccinesError } = await supabase
        .from('vaccines')
        .insert(defaultVaccines);

      if (vaccinesError) throw vaccinesError;

      // Reload pets
      await loadPets(user.id);
      
      setPetForm({ name: "", breed: "", age: "", weight: "", photo_url: "" });
      setShowAddPet(false);
    } catch (error) {
      console.error('Error adding pet:', error);
      alert('Erro ao adicionar pet. Tente novamente.');
    }
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Mock data for services
  const petServices: PetService[] = [
    {
      id: "1",
      name: "PetShop Amigo Fiel",
      type: "petshop",
      address: "Rua das Flores, 123",
      phone: "(11) 98765-4321",
      hours: "Seg-Sex: 8h-18h",
      distance: "1.2 km"
    },
    {
      id: "2",
      name: "Clínica Veterinária Vida Animal",
      type: "clinic",
      address: "Av. Principal, 456",
      phone: "(11) 91234-5678",
      hours: "24 horas",
      distance: "2.5 km"
    },
    {
      id: "3",
      name: "PetShop Bicho Feliz",
      type: "petshop",
      address: "Rua do Comércio, 789",
      phone: "(11) 99876-5432",
      hours: "Seg-Sáb: 9h-19h",
      distance: "3.1 km"
    }
  ];

  // Mock data for training guides
  const trainingGuides: TrainingGuide[] = [
    {
      id: "1",
      title: "Comando Sentar",
      description: "Ensine seu pet a sentar com reforço positivo",
      difficulty: "Fácil",
      duration: "5-10 min/dia"
    },
    {
      id: "2",
      title: "Passeio com Guia",
      description: "Treine seu pet a andar sem puxar a coleira",
      difficulty: "Médio",
      duration: "15-20 min/dia"
    },
    {
      id: "3",
      title: "Socialização",
      description: "Ajude seu pet a interagir com outros animais",
      difficulty: "Médio",
      duration: "20-30 min/dia"
    },
    {
      id: "4",
      title: "Comando Ficar",
      description: "Ensine seu pet a permanecer no lugar",
      difficulty: "Avançado",
      duration: "10-15 min/dia"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Onboarding screens
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Bem-vindo ao GuiaPet
            </CardTitle>
            <CardDescription className="text-lg">
              Seu assistente inteligente para cuidar do seu melhor amigo
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-lg">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-900">Perfil Completo</h3>
                      <p className="text-sm text-emerald-700">Cadastre informações, vacinas e histórico de saúde</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Radar Pet</h3>
                      <p className="text-sm text-blue-700">Encontre petshops e clínicas próximas a você</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-purple-900">Guias de Treinamento</h3>
                      <p className="text-sm text-purple-700">Acesse dicas e treinos para seu pet</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => setCurrentStep(1)} 
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-lg h-12"
                >
                  Começar
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">Cadastre seu primeiro pet</h3>
                  <p className="text-gray-600">Vamos começar com as informações básicas</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="onb-name">Nome do Pet *</Label>
                    <Input
                      id="onb-name"
                      placeholder="Ex: Rex, Mia, Bob..."
                      value={petForm.name}
                      onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onb-breed">Raça *</Label>
                    <Input
                      id="onb-breed"
                      placeholder="Ex: Labrador, Persa, SRD..."
                      value={petForm.breed}
                      onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="onb-age">Idade</Label>
                      <Input
                        id="onb-age"
                        placeholder="Ex: 2 anos"
                        value={petForm.age}
                        onChange={(e) => setPetForm({ ...petForm, age: e.target.value })}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="onb-weight">Peso</Label>
                      <Input
                        id="onb-weight"
                        placeholder="Ex: 15 kg"
                        value={petForm.weight}
                        onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(0)}
                    className="flex-1 h-12"
                  >
                    Voltar
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (petForm.name && petForm.breed) {
                        await handleAddPet();
                        completeOnboarding();
                      }
                    }}
                    disabled={!petForm.name || !petForm.breed}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12"
                  >
                    Finalizar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              GuiaPet
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {selectedPet && selectedPet.vaccines.some(v => {
                const nextDate = new Date(v.next_date);
                const today = new Date();
                const diffDays = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays <= 30 && diffDays >= 0;
              }) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-white shadow-sm">
            <TabsTrigger value="meu-pet" className="flex flex-col gap-1 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <Heart className="w-5 h-5" />
              <span className="text-xs">Meu Pet</span>
            </TabsTrigger>
            <TabsTrigger value="radar" className="flex flex-col gap-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <MapPin className="w-5 h-5" />
              <span className="text-xs">Radar Pet</span>
            </TabsTrigger>
            <TabsTrigger value="treinador" className="flex flex-col gap-1 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
              <User className="w-5 h-5" />
              <span className="text-xs">Treinador</span>
            </TabsTrigger>
          </TabsList>

          {/* Meu Pet Tab */}
          <TabsContent value="meu-pet" className="space-y-6">
            {pets.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Heart className="w-10 h-10 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum pet cadastrado</h3>
                    <p className="text-gray-600 mb-6">Adicione seu primeiro pet para começar</p>
                    <Dialog open={showAddPet} onOpenChange={setShowAddPet}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white">
                          <Plus className="w-5 h-5 mr-2" />
                          Adicionar Pet
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Adicionar Novo Pet</DialogTitle>
                          <DialogDescription>
                            Preencha as informações do seu pet
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                              id="name"
                              value={petForm.name}
                              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
                              placeholder="Nome do pet"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="breed">Raça *</Label>
                            <Input
                              id="breed"
                              value={petForm.breed}
                              onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                              placeholder="Raça do pet"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="age">Idade</Label>
                              <Input
                                id="age"
                                value={petForm.age}
                                onChange={(e) => setPetForm({ ...petForm, age: e.target.value })}
                                placeholder="Ex: 2 anos"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="weight">Peso</Label>
                              <Input
                                id="weight"
                                value={petForm.weight}
                                onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })}
                                placeholder="Ex: 15 kg"
                              />
                            </div>
                          </div>
                          <Button 
                            onClick={handleAddPet}
                            disabled={!petForm.name || !petForm.breed}
                            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                          >
                            Adicionar Pet
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Pet Profile Card */}
                <Card className="overflow-hidden shadow-lg">
                  <div className="bg-gradient-to-r from-emerald-400 to-blue-500 h-24"></div>
                  <CardContent className="relative pt-16 pb-6">
                    <Avatar className="absolute -top-12 left-6 w-24 h-24 border-4 border-white shadow-xl">
                      <AvatarImage src={selectedPet?.photo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-300 to-blue-400 text-white text-3xl font-bold">
                        {selectedPet?.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex justify-end mb-4">
                      <Dialog open={showAddPet} onOpenChange={setShowAddPet}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Pet
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Adicionar Novo Pet</DialogTitle>
                            <DialogDescription>
                              Preencha as informações do seu pet
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name2">Nome *</Label>
                              <Input
                                id="name2"
                                value={petForm.name}
                                onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
                                placeholder="Nome do pet"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="breed2">Raça *</Label>
                              <Input
                                id="breed2"
                                value={petForm.breed}
                                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                                placeholder="Raça do pet"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="age2">Idade</Label>
                                <Input
                                  id="age2"
                                  value={petForm.age}
                                  onChange={(e) => setPetForm({ ...petForm, age: e.target.value })}
                                  placeholder="Ex: 2 anos"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="weight2">Peso</Label>
                                <Input
                                  id="weight2"
                                  value={petForm.weight}
                                  onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })}
                                  placeholder="Ex: 15 kg"
                                />
                              </div>
                            </div>
                            <Button 
                              onClick={handleAddPet}
                              disabled={!petForm.name || !petForm.breed}
                              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                            >
                              Adicionar Pet
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">{selectedPet?.name}</h2>
                        <p className="text-gray-600">{selectedPet?.breed}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          {selectedPet?.health_status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Idade</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedPet?.age || "Não informado"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Peso</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedPet?.weight || "Não informado"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vaccine Alerts */}
                {selectedPet && selectedPet.vaccines.some(v => {
                  const nextDate = new Date(v.next_date);
                  const today = new Date();
                  const diffDays = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return diffDays <= 30 && diffDays >= 0;
                }) && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <Bell className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Você tem vacinas próximas do vencimento. Confira abaixo!
                    </AlertDescription>
                  </Alert>
                )}

                {/* Vaccines Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      Vacinas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPet?.vaccines.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Nenhuma vacina cadastrada</p>
                    ) : (
                      selectedPet?.vaccines.map((vaccine) => {
                        const nextDate = new Date(vaccine.next_date);
                        const today = new Date();
                        const diffDays = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const isUpcoming = diffDays <= 30 && diffDays >= 0;

                        return (
                          <div key={vaccine.id} className={`p-4 rounded-lg border-2 ${isUpcoming ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h4 className="font-semibold text-gray-900">{vaccine.name}</h4>
                                <p className="text-sm text-gray-600">Última dose: {new Date(vaccine.date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-sm font-medium text-gray-900">Próxima dose: {new Date(vaccine.next_date).toLocaleDateString('pt-BR')}</p>
                              </div>
                              {isUpcoming && (
                                <Badge className="bg-amber-500 text-white">
                                  {diffDays} dias
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Pet List */}
                {pets.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Meus Pets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pets.map((pet) => (
                        <button
                          key={pet.id}
                          onClick={() => setSelectedPet(pet)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            selectedPet?.id === pet.id
                              ? 'bg-emerald-50 border-2 border-emerald-200'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={pet.photo_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-300 to-blue-400 text-white font-bold">
                              {pet.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900">{pet.name}</p>
                            <p className="text-sm text-gray-600">{pet.breed}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Radar Pet Tab */}
          <TabsContent value="radar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Serviços Próximos
                </CardTitle>
                <CardDescription>
                  Encontre petshops e clínicas veterinárias perto de você
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mock Map */}
                <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-lg mb-6 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="absolute top-3/4 left-3/4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-center z-10">
                    <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-blue-800 font-medium">Mapa Interativo</p>
                    <p className="text-sm text-blue-600">Visualize serviços próximos</p>
                  </div>
                </div>

                {/* Services List */}
                <div className="space-y-3">
                  {petServices.map((service) => (
                    <Card key={service.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            service.type === 'petshop' ? 'bg-emerald-100' : 'bg-blue-100'
                          }`}>
                            <Home className={`w-6 h-6 ${
                              service.type === 'petshop' ? 'text-emerald-600' : 'text-blue-600'
                            }`} />
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                                <Badge variant="outline" className="mt-1">
                                  {service.type === 'petshop' ? 'PetShop' : 'Clínica'}
                                </Badge>
                              </div>
                              <span className="text-sm font-medium text-blue-600">{service.distance}</span>
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{service.address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{service.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{service.hours}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treinador Tab */}
          <TabsContent value="treinador" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Guias de Treinamento
                </CardTitle>
                <CardDescription>
                  Aprenda técnicas e comandos para treinar seu pet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainingGuides.map((guide) => (
                  <Card key={guide.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-purple-600" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{guide.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{guide.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge 
                              variant="outline"
                              className={
                                guide.difficulty === 'Fácil' 
                                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                  : guide.difficulty === 'Médio'
                                  ? 'border-amber-200 text-amber-700 bg-amber-50'
                                  : 'border-red-200 text-red-700 bg-red-50'
                              }
                            >
                              {guide.difficulty}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{guide.duration}</span>
                            </div>
                          </div>
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Alert className="border-purple-200 bg-purple-50">
              <Info className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <strong>Dica:</strong> Pratique os exercícios diariamente e use reforço positivo (petiscos e carinho) para melhores resultados!
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
