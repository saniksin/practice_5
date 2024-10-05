import { BigInt } from "@graphprotocol/graph-ts"
import {
  Deposit as DepositEvent,
  Withdrawal as WithdrawalEvent
} from "../generated/Bank/Bank"
import { Deposit, User, Withdrawal } from "../generated/schema"


export function handleDeposit(event: DepositEvent): void {
  let user = User.load(event.params.account)
  if (!user) {
    user = new User(event.params.account)
    user.balance = BigInt.zero()
  }
  user.balance = user.balance.plus(event.params.amount)
  user.save()

  const entity = new Deposit(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.user = user.id

  entity.save()
}

export function handleWithdrawal(event: WithdrawalEvent): void {
  let user = User.load(event.params.account)
  if (!user) {
    user = new User(event.params.account)
    user.balance = BigInt.zero()
  }
  user.balance = user.balance.minus(event.params.amount)
  user.save()

  let entity = new Withdrawal(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.amount = event.params.amount
  entity.user = user.id

  entity.save()
}
