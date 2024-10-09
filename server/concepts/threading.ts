import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface ThreadDoc extends BaseDoc {
  head: ObjectId;
  body: ObjectId[];
  tail: ObjectId;
}

/**
 * concept: Threading
 *
 */
export default class ThreadingConcept {
  public readonly threads: DocCollection<ThreadDoc>;

  /**
   * Make an instance of Threading.
   */
  constructor(collectionName: string) {
    this.threads = new DocCollection<ThreadDoc>(collectionName);
  }

  async addToThread(head: ObjectId, item: ObjectId) {
    const itemThread = await this.threads.readOne({ $or: [{ head: item }, { body: { $in: [item] } }, { tail: item }] }); // Case where item is already used
    if (itemThread != null) {
      throw new NotAllowedError(`Item: ${item.toString} is already in a thread!`);
    }
    const headThread = await this.threads.readOne({ $or: [{ head: head }, { body: { $in: [head] } }, { tail: head }] }); //this can't be right, right?
    if (headThread == null) {
      await this.threads.createOne({ head: head, body: [], tail: item });
      return { msg: "Success! Created new thread" };
    } else if (headThread.head.equals(head) || headThread.body.includes(head)) {
      throw new NotAllowedError(`Head: ${head.toString} has already been threaded to`);
    } else {
      headThread.body.push(head);
      await this.threads.partialUpdateOne({ _id: headThread._id }, { body: headThread.body, tail: item });
      return { msg: "Success! Added new object to thread!" };
    }
  }

  async unthread(item: ObjectId) {
    const thread = await this.threads.readOne({ $or: [{ head: item }, { body: { $in: [item] } }, { tail: item }] });
    if (thread == null) {
      throw new NotAllowedError(`item was not in a thread!`);
    }
    if (thread.head.equals(item)) {
      if (!thread.body.length) {
        this.threads.deleteOne({ head: thread.head });
        return { msg: `Success! Removed ${item} from thread by deleting thread` };
      } else {
        const newHead = thread.body.shift();
        this.threads.partialUpdateOne({ _id: thread._id }, { head: newHead, body: thread.body });
        return { msg: `Success! Removed ${item} from thread` };
      }
    } else if (thread.tail.equals(item)) {
      if (!thread.body.length) {
        this.threads.deleteOne({ head: thread.head });
        return { msg: `Success! Removed ${item} from thread by deleting thread` };
      } else {
        const newTail = thread.body.pop();
        this.threads.partialUpdateOne({ _id: thread._id }, { tail: newTail, body: thread.body });
        return { msg: `Success! Removed ${item} from thread` };
      }
    } else {
      const newBody = thread.body.filter((obj) => !obj.equals(item));
      this.threads.partialUpdateOne({ _id: thread._id }, { body: newBody });
      return { msg: `Success! Removed ${item} from thread` };
    }
  }
  /**
   *
   * @param item
   * @returns the next item or null if item is the tail of a thread
   */
  async getNext(item: ObjectId) {
    const thread = await this.threads.readOne({ $or: [{ head: item }, { body: { $in: [item] } }, { tail: item }] });
    if (thread == null) {
      throw new NotAllowedError(`item was not in a thread!`);
    }
    if (thread.head.equals(item)) {
      if (!thread.body.length) {
        return thread.tail;
      } else {
        return thread.body[0];
      }
    } else if (thread.tail.equals(item)) {
      return null;
    } else {
      const index = thread.body.findIndex((curr) => curr.equals(item));
      if (thread.body.length - 1 == index) {
        return thread.tail;
      } else {
        return thread.body[index];
      }
    }
  }
  /**
   *
   * @param item
   * @returns the previous item if it exists or null if item is the head of a thread
   */
  async getPrev(item: ObjectId) {
    const thread = await this.threads.readOne({ $or: [{ head: item }, { body: { $in: [item] } }, { tail: item }] });
    if (thread == null) {
      throw new NotAllowedError(`item was not in a thread!`);
    }
    if (thread.tail.equals(item)) {
      if (!thread.body.length) {
        return thread.head;
      } else {
        return thread.body[-1];
      }
    } else if (thread.head.equals(item)) {
      return null;
    } else {
      const index = thread.body.findIndex((curr) => curr.equals(item));
      if (index === 0) {
        return thread.head;
      } else {
        return thread.body[index - 1];
      }
    }
  }
}
