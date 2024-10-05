import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PermissionDoc extends BaseDoc {
  party: String;
  actions: Object[];
}

/**
 * concept: Permissioning
 *
 */

export default class PermissioningConcept {
  public readonly perms: DocCollection<PermissionDoc>;

  /**
   * Make an instance of permissioning.
   */
  constructor(collectionName: string) {
    this.perms = new DocCollection<PermissionDoc>(collectionName);
  }

  async createParty(party: string) {
    this.partyIsUnique(party);
    const _id = await this.perms.createOne({ party, actions: [] });
    return { msg: "PermissionLog created successfully!", title: await this.perms.readOne({ _id }) };
  }

  async partyFromId(_id: ObjectId) {
    const userPerms = await this.perms.readOne({ _id });
    if (userPerms == null) {
      throw new NotFoundError(`No user found in perms: ${_id.toString}`);
    }
    return userPerms.party;
  }

  async getIdFromParty(party: string) {
    const userPerms = await this.perms.readOne({ party });
    if (userPerms == null) {
      throw new NotFoundError(`No party found in perms: ${party}`);
    }
    return userPerms._id;
  }

  async checkAllPerms(_id: ObjectId) {
    const userPerms = await this.perms.readOne({ _id });
    if (userPerms == null) {
      throw new NotFoundError(`No user found in perms: ${_id.toString}`);
    }
    return userPerms.actions;
  }

  async addPerm(_id: ObjectId, perm: Object) {
    const userPerms = await this.perms.readOne({ _id });
    if (userPerms == null) {
      throw new NotFoundError(`No user found in perms: ${_id.toString}`);
    }
    if (userPerms.actions.includes(perm)) {
      throw new NotAllowedError(`User already has perm: ${perm.toString}`);
    }
    userPerms.actions.push();
    await this.perms.partialUpdateOne({ _id }, { actions: userPerms.actions });

    return { msg: `Added perm: ${perm}!` };
  }

  async removePerm(_id: ObjectId, perm: Object) {
    const userPerms = await this.perms.readOne({ _id });
    if (userPerms == null) {
      throw new NotFoundError(`No user found in perms: ${_id.toString}`);
    }
    if (!userPerms.actions.includes(perm)) {
      throw new NotAllowedError(`User does not have perm: ${perm.toString}`);
    }
    userPerms.actions.filter((obj) => obj !== perm);
    await this.perms.partialUpdateOne({ _id }, { actions: userPerms.actions });
    return { msg: `removed perm: ${perm}!` };
  }

  async hasPerm(_id: ObjectId, perm: Object) {
    const userPerms = await this.perms.readOne({ _id });
    if (userPerms == null) {
      throw new NotFoundError(`No user found in perms: ${_id.toString}`);
    }
    return userPerms.actions.includes(perm);
  }

  async removeParty(_id: ObjectId) {
    await this.perms.deleteOne({ _id });
    return { msg: "User deleted!" };
  }

  private async partyIsUnique(party: string) {
    const userPerms = await this.perms.readOne({ party });
    if (!userPerms == null) {
      throw new NotAllowedError(`Username:${party} already has perms set assigned`);
    }
  }
}
