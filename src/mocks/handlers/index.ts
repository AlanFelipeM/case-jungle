import { nftHandlers } from './nfts'
import { cartHandlers } from './cart'

export const handlers = [...nftHandlers, ...cartHandlers]
