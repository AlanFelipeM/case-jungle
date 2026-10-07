import { failureHandlers } from './failures'
import { nftHandlers } from './nfts'
import { cartHandlers } from './cart'
import { realtimeHandlers } from './realtime'

// failureHandlers primeiro: intercepta só quando há uma falha agendada
export const handlers = [...failureHandlers, ...nftHandlers, ...cartHandlers, ...realtimeHandlers]
