import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PermissionDoc extends BaseDoc {
  object: Object;
  users: ObjectId[];
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

  async createPerm(object: ObjectId) {
    this.checkObjectIsUnique(object);
    const _id = await this.perms.createOne({ object, users: [] });
    return { msg: "PermissionLog created successfully!", title: await this.perms.readOne({ _id }) };
  }

  // I don't think this is actually necessary
  //   async partyFromId(_id: ObjectId) {
  //     const userPerms = await this.perms.readOne({ _id });
  //     if (userPerms == null) {
  //       throw new NotFoundError(`No user found in perms: ${_id.toString}`);
  //     }
  //     return userPerms.party;
  //   }

  //   async getIdFromParty(party: string) {
  //     const userPerms = await this.perms.readOne({ party });
  //     if (userPerms == null) {
  //       throw new NotFoundError(`No party found in perms: ${party}`);
  //     }
  //     return userPerms._id;
  //   }

  /**
   *
   * @param user The user whose permissions you are searching for
   * @returns a list of all PermissionDocs that have user in list of users
   */
  async getAuthorizedActions(user: ObjectId) {
    const userPerms = await this.perms.readMany({ users: { $elemMatch: { user } } });
    if (userPerms == null) {
      throw new NotFoundError(`No user found in perms: ${user.toString}`);
    }
    return userPerms;
  }
  /**
   *
   * @param _id
   * @param perm
   * @returns
   */
  async giveUserPerm(user: ObjectId, object: Object) {
    const objectPerms = await this.perms.readOne({ object });
    if (objectPerms == null) {
      throw new NotFoundError(`No object found in perms: ${object.toString}`);
    }
    if (objectPerms.users.includes(user)) {
      throw new NotAllowedError(`User already has perm: ${object.toString}`);
    }
    objectPerms.users.push(user);
    await this.perms.partialUpdateOne({ object }, { users: objectPerms.users });

    return { msg: `Added user: ${user} to perm: ${object.toString}!` };
  }

  async removeUserPerm(user: ObjectId, object: Object) {
    const objectPerms = await this.perms.readOne({ object });
    if (objectPerms == null) {
      throw new NotFoundError(`No object found in perms: ${object.toString}`);
    }
    if (!objectPerms.users.includes(user)) {
      throw new NotAllowedError(`user does not have perm: ${object.toString}`);
    }
    const newUsers = objectPerms.users.filter((currUser) => currUser !== user);
    await this.perms.partialUpdateOne({ object }, { users: newUsers });
    return { msg: `removed user: ${user} from perm: ${object}!` };
  }

  async hasPerm(user: ObjectId, object: Object) {
    const objectPerms = await this.perms.readOne({ object });
    if (objectPerms == null) {
      throw new NotFoundError(`No user found in perms: ${object.toString}`);
    }
    return objectPerms.users.includes(user);
  }

  async delPerm(object: Object) {
    await this.perms.deleteOne({ object });
    return { msg: "Object perms deleted!" };
  }

  //This can be a little buggy since object equivalence checks is a bit fuzzy at such a vague level. May be worth constricting to immutable objects?
  /**
   *
   * @param object The object to check if it has already had a permDoc created for it
   * @throws NotAllowedError if the object already has a PermDoc created for it
   */
  private async checkObjectIsUnique(object: Object) {
    const objectPerms = await this.perms.readOne({ object });
    if (!objectPerms == null) {
      throw new NotAllowedError(`Object:${object} already has perms set assigned`);
    }
  }
}
