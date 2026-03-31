import { supabase } from '../lib/supabase';

// Ponto Fixo de Início
const ROUTE_START_MOCKUP = "Rua Ernestina Ribeiro Camilo, 71, São Paulo, SP";
// Ponto Fixo de Fim
const ROUTE_END_MOCKUP = "Avenida Anacê, 337, São Paulo, SP";

// Calcula a distância usando a fórmula de Haversine (linha reta na esfera terrestre)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

/**
 * 1. Pega endereços faltantes e bate na API do Maps para pegar (Lat, Lng)
 * 2. Atualiza os items no banco se encontrou lat/lng
 * 3. Usa o algoritmo do "Vizinho Mais Próximo" (Nearest Neighbor) do começo ao fim
 */
export async function optimizeRoute(groups, onProgress) {
  onProgress('Consultando Geolocalização...');
  
  // 1. Identificar quais "Grupos" (Endereços Únicos) precisam de Geocodificação
  const needsGeocode = groups.filter(g => !g.lat || !g.lng);
  
  let geocodedMap = new Map(); // endereco_completo -> {lat, lng}
  
  // Precisamos sempre saber onde é o Início e o Fim no Mundo Físico
  let startCoords = null;
  let endCoords = null;

  try {
    const addressesToGeocode = needsGeocode.map(g => ({
      id: g.id, 
      endereco_completo: `${g.endereco}, ${g.numero} ${g.cep ? g.cep : ''}`
    }));

    // Injeta Start e End no mesmo lote para garantir que temos as coords deles
    addressesToGeocode.push({ id: 'START_NODE', endereco_completo: ROUTE_START_MOCKUP });
    addressesToGeocode.push({ id: 'END_NODE', endereco_completo: ROUTE_END_MOCKUP });

    if (addressesToGeocode.length > 0) {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { addresses: addressesToGeocode }
      });

      if (error) throw error;

      if (data && data.results) {
        data.results.forEach(res => {
          if (res.lat && res.lng) {
            if (res.id === 'START_NODE') {
              startCoords = res;
            } else if (res.id === 'END_NODE') {
              endCoords = res;
            } else {
              geocodedMap.set(res.endereco_completo, { lat: res.lat, lng: res.lng });
              // Opcional futuro: Atualizar o Supabase via update na tabela entregas
            }
          }
        });
        
        // Em um cenário real, deveríamos salvar essas latitudes e longitudes no banco
        // usando a referência do id do pacote para não gastar chamadas do Maps novamente.
      }
    }
  } catch (err) {
    console.error("Geocoding API Error", err);
    throw new Error('Falha ao obter coordenadas do Google Maps.');
  }

  onProgress('Calculando melhor caminho...');

  // 2. Mesclar as Coordenadas Novas + Existentes nos Grupos
  const groupsWithCoords = groups.map(g => {
    const fullQueryString = `${g.endereco}, ${g.numero} ${g.cep ? g.cep : ''}`;
    const newCoords = geocodedMap.get(fullQueryString);
    return {
      ...g,
      lat: newCoords?.lat || g.lat || null,
      lng: newCoords?.lng || g.lng || null
    };
  });

  // Filtramos apenas as que tem coordenadas válidas para entrar no TSP
  const validGroups = groupsWithCoords.filter(g => g.lat && g.lng);
  const invalidGroups = groupsWithCoords.filter(g => !g.lat || !g.lng);

  if (!startCoords || validGroups.length === 0) {
    // Retorna do jeito que veio caso falte geocodificação pro Ponto de Partida
    return groupsWithCoords;
  }

  // 3. Nearest Neighbor Algorithm (O(N^2))
  let unvisited = [...validGroups];
  let currentPos = startCoords;
  let optimizedSequence = [];

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let shortestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const node = unvisited[i];
      let dist = getDistanceFromLatLonInKm(currentPos.lat, currentPos.lng, node.lat, node.lng);
      
      // Peso heurístico: Puxar a rota rumo ao destino final
      // Se tivermos endCoords, reduzimos a penalidade de nós que estão geograficamente perto do Destino
      if (endCoords) {
        const distToEnd = getDistanceFromLatLonInKm(node.lat, node.lng, endCoords.lat, endCoords.lng);
        dist = dist + (distToEnd * 0.1); // Dá preferência leve para ir se aproximando do fim
      }

      if (dist < shortestDist) {
        shortestDist = dist;
        nearestIdx = i;
      }
    }

    // Marca como visitado e torna a posição atual
    const nextNode = unvisited.splice(nearestIdx, 1)[0];
    optimizedSequence.push(nextNode);
    currentPos = { lat: nextNode.lat, lng: nextNode.lng };
  }

  // Devolve primeiro os otimizados e joga no final quem não obteve Coordenada (caiu no fallback)
  return [...optimizedSequence, ...invalidGroups];
}
