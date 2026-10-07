import { failureHandlers } from './failures'
import { authHandlers } from './auth'
import { accountHandlers } from './account'
import { nftHandlers } from './nfts'
import { cartHandlers } from './cart'
import { checkoutHandlers } from './checkout'
import { realtimeHandlers } from './realtime'

// failureHandlers primeiro: intercepta só quando há uma falha agendada
export const handlers = [
  ...failureHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...nftHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...realtimeHandlers,
]
