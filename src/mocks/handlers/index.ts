import { nftHandlers } from './nfts'
import { cartHandlers } from './cart'
import { realtimeHandlers } from './realtime'

export const handlers = [...nftHandlers, ...cartHandlers, ...realtimeHandlers]
